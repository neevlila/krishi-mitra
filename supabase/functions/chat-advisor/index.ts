import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Round-Robin / Load-Balancing Model Pool ---
const MODELS_POOL = [
  "nvidia/nemotron-3-ultra-550b-a55b",
  "meta/llama-3.1-70b-instruct"
];
let roundRobinCounter = 0;

interface NvidiaMessage {
  role: string;
  content: string;
}

interface NvidiaPayload {
  model: string;
  messages: NvidiaMessage[];
  temperature: number;
  top_p: number;
  max_tokens: number;
  chat_template_kwargs?: { enable_thinking: boolean };
  reasoning_budget?: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get client authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header for authentication." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access: Invalid session token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Database rate limiting (10 queries per minute per user)
    const { data: allowed, error: limitError } = await supabaseClient.rpc(
      'increment_rate_limit',
      {
        p_user_id: user.id,
        p_endpoint: 'chat-advisor',
        p_window_seconds: 60,
        p_max_requests: 10
      }
    );

    if (limitError) {
      console.error("Rate limiter query failed:", limitError);
    } else if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many chat messages. Please wait a minute before sending another question." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse input
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid prompt payload. Must be a non-empty string." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Read NVIDIA API key from environment secrets
    const NVIDIA_API_KEY = Deno.env.get("NVIDIA_API_KEY");
    if (!NVIDIA_API_KEY) {
      return new Response(
        JSON.stringify({ error: "NVIDIA_API_KEY secret is not set in the Supabase backend." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Select model using Round-Robin
    const primaryModel = MODELS_POOL[roundRobinCounter];
    roundRobinCounter = (roundRobinCounter + 1) % MODELS_POOL.length;
    const fallbackModel = MODELS_POOL.find(m => m !== primaryModel) || "meta/llama-3.1-70b-instruct";

    let response: Response | null = null;
    let fallbackUsed = false;

    // 5. Try Primary Model
    try {
      console.log(`Routing request to primary model: ${primaryModel}`);
      const bodyPayload: NvidiaPayload = {
        model: primaryModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 1024
      };

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
        console.warn(`Primary model ${primaryModel} failed with status ${response.status}. Attempting fallback...`);
        fallbackUsed = true;
      }
    } catch (fetchErr: unknown) {
      const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.warn(`Primary model fetch error: ${errMsg}. Attempting fallback...`);
      fallbackUsed = true;
    }

    // 6. Try Fallback Model if primary failed
    if (fallbackUsed || !response) {
      const bodyPayload: NvidiaPayload = {
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
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const decoder = new TextDecoder("utf-8");
    const jsonText = decoder.decode(arrayBuffer);
    const data = JSON.parse(jsonText);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Chat advisor handler error:", errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
