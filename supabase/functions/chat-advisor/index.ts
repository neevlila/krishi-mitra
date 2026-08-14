import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- In-Memory IP-Based Rate Limiting ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;   // Max 10 requests per minute

// --- Round-Robin / Load-Balancing Model Pool ---
const MODELS_POOL = [
  "nvidia/nemotron-3-ultra-550b-a55b",
  "meta/llama-3.1-70b-instruct"
];
let roundRobinCounter = 0;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. IP Rate Limiting Check
    const clientIp = req.headers.get("x-real-ip") || 
                     req.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
                     "unknown-client";

    const now = Date.now();
    const rateData = rateLimitMap.get(clientIp);

    if (rateData && now < rateData.resetTime) {
      if (rateData.count >= MAX_REQUESTS_PER_WINDOW) {
        const retryAfter = Math.ceil((rateData.resetTime - now) / 1000);
        return new Response(
          JSON.stringify({ error: `Too many requests. Please wait ${retryAfter} seconds before asking another question.` }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json; charset=utf-8",
              "Retry-After": retryAfter.toString()
            } 
          }
        );
      }
      rateData.count++;
    } else {
      rateLimitMap.set(clientIp, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW
      });
    }

    const { prompt } = await req.json();
    
    // Read NVIDIA API key from environment secrets
    const NVIDIA_API_KEY = Deno.env.get("NVIDIA_API_KEY");
    if (!NVIDIA_API_KEY) {
      return new Response(
        JSON.stringify({ error: "NVIDIA_API_KEY secret is not set in the Supabase backend." }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } 
        }
      );
    }

    // 2. Select model using Round-Robin (Robin Routing)
    const primaryModel = MODELS_POOL[roundRobinCounter];
    roundRobinCounter = (roundRobinCounter + 1) % MODELS_POOL.length;
    const fallbackModel = MODELS_POOL.find(m => m !== primaryModel) || "meta/llama-3.1-70b-instruct";

    let response;
    let fallbackUsed = false;

    // 3. Try Primary Model
    try {
      console.log(`Routing request to primary model: ${primaryModel}`);
      const bodyPayload: any = {
        model: primaryModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 1024
      };

      // Add thinking parameters if Nemotron model is selected
      if (primaryModel.includes("nemotron")) {
        bodyPayload.chat_template_kwargs = { enable_thinking: true };
        bodyPayload.reasoning_budget = 1024;
      }

      response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Bearer ${NVIDIA_API_KEY}`
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        console.warn(`Primary model ${primaryModel} failed with status ${response.status}. Attempting fallback: ${fallbackModel}...`);
        fallbackUsed = true;
      }
    } catch (fetchErr) {
      console.warn(`Primary model fetch error: ${fetchErr.message}. Attempting fallback: ${fallbackModel}...`);
      fallbackUsed = true;
    }

    // 4. Try Fallback Model
    if (fallbackUsed || !response) {
      const bodyPayload: any = {
        model: fallbackModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 1024
      };

      if (fallbackModel.includes("nemotron")) {
        bodyPayload.chat_template_kwargs = { enable_thinking: true };
        bodyPayload.reasoning_budget = 1024;
      }

      response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Bearer ${NVIDIA_API_KEY}`
        },
        body: JSON.stringify(bodyPayload)
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `NVIDIA NIM API returned status ${response.status}: ${errText}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } 
        }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const decoder = new TextDecoder("utf-8");
    const jsonText = decoder.decode(arrayBuffer);
    const data = JSON.parse(jsonText);

    // Return the response, adding model metadata for transparency if needed
    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } 
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || error }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } 
      }
    );
  }
});
