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

    // 2. Database rate limiting (15 queries per minute per user)
    const { data: allowed, error: limitError } = await supabaseClient.rpc(
      'increment_rate_limit',
      {
        p_user_id: user.id,
        p_endpoint: 'weather-service',
        p_window_seconds: 60,
        p_max_requests: 15
      }
    );

    if (limitError) {
      console.error("Rate limiter query failed:", limitError);
    } else if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many weather telemetry requests. Please wait before refreshing." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse input
    const { city, lat, lon, lang } = await req.json();
    const cleanLang = ['en', 'hi', 'gu'].includes(lang) ? lang : 'en';

    // Read Weather API key from secrets
    const WEATHER_API_KEY = Deno.env.get("WEATHER_API_KEY");
    if (!WEATHER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "WEATHER_API_KEY secret is not configured in the Supabase backend." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let url = "";
    if (lat !== undefined && lon !== undefined) {
      const cleanLat = Number(lat);
      const cleanLon = Number(lon);
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${cleanLat}&lon=${cleanLon}&appid=${WEATHER_API_KEY}&units=metric&lang=${cleanLang}`;
    } else if (city) {
      const cleanCity = String(city).trim().slice(0, 100);
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cleanCity)}&appid=${WEATHER_API_KEY}&units=metric&lang=${cleanLang}`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid parameters. Provide city name or coordinates (lat, lon)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenWeatherMap fetch failed:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Weather service error: ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Weather service function handler error:", errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
