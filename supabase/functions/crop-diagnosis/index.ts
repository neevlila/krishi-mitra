import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
        p_endpoint: 'crop-diagnosis',
        p_window_seconds: 60,
        p_max_requests: 10
      }
    );

    if (limitError) {
      console.error("Rate limiter query failed:", limitError);
    } else if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many diagnosis requests. Please wait a minute before analyzing another crop leaf." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse and validate input
    const { image, mimeType, languageCode } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Missing base64 image data payload." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const cleanMimeType = supportedMimeTypes.includes(mimeType) ? mimeType : 'image/jpeg';
    const cleanLang = ['en', 'hi', 'gu'].includes(languageCode) ? languageCode : 'en';

    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'hi': 'Hindi',
      'gu': 'Gujarati'
    };
    const responseLang = languageMap[cleanLang];

    // Read Gemini API Key from secrets
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY secret is not configured in the Supabase backend." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construct the prompts and rules securely on the server side
    const prompt = `You are an expert agricultural AI assistant specializing in crop disease diagnosis. 
    Analyze this image of a crop/plant and provide your ENTIRE response in ${responseLang} language.
    
    CRITICAL: Every single word, label, heading, and piece of content MUST be in ${responseLang} language.
    
    1. Diagnosis: Identify any diseases, pests, or health issues visible in the image (in ${responseLang})
    2. Confidence: Rate your confidence level (Low, Moderate, High) based on visual clarity and certainty
    3. Advice: Provide actionable treatment recommendations, label-compliant pesticide/organic solutions, and preventive measures (in ${responseLang})
    
    Format your response as JSON with the following structure:
    {
      "diagnosis": "detailed diagnosis written entirely in ${responseLang}",
      "confidence": "Low | Moderate | High",
      "advice": "detailed advice and recommendations written entirely in ${responseLang}"
    }
    
    DO NOT include any English words in the diagnosis or advice fields unless they are technical names of pests or chemicals.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: cleanMimeType, data: image } }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini Vision API call failed:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Gemini Vision API returned error: ${response.status} ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseData = await response.json();
    const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let jsonResult;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Unable to locate valid JSON response object.");
      }
    } catch (parseErr) {
      console.error("JSON parsing of Gemini response failed:", parseErr, text);
      return new Response(
        JSON.stringify({ error: "Received invalid unstructured payload from agricultural vision analysis engine." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(jsonResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Diagnosis function handler error:", errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
