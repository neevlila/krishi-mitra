import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    // Read NVIDIA API key from Deno environment secrets
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

    let response;
    let fallbackUsed = false;

    // 1. Primary Choice: Try nemotron-3-ultra-550b-a55b
    try {
      response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Bearer ${NVIDIA_API_KEY}`
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-ultra-550b-a55b",
          messages: [{ role: "user", content: prompt }],
          temperature: 1,
          top_p: 0.95,
          max_tokens: 1024,
          chat_template_kwargs: { enable_thinking: true },
          reasoning_budget: 1024
        })
      });

      if (!response.ok) {
        console.warn(`Nemotron-3 failed with status ${response.status}. Trying Llama-3.1-70b fallback...`);
        fallbackUsed = true;
      }
    } catch (fetchErr) {
      console.warn(`Nemotron-3 fetch error: ${fetchErr.message}. Trying Llama-3.1-70b fallback...`);
      fallbackUsed = true;
    }

    // 2. Fallback Option: If Nemotron fails or is overloaded, query the ultra-stable Llama-3.1-70b-instruct
    if (fallbackUsed || !response) {
      response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Bearer ${NVIDIA_API_KEY}`
        },
        body: JSON.stringify({
          model: "meta/llama-3.1-70b-instruct",
          messages: [{ role: "user", content: prompt }],
          temperature: 1,
          top_p: 0.95,
          max_tokens: 1024
        })
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `NVIDIA API returned status ${response.status}: ${errText}` }),
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
