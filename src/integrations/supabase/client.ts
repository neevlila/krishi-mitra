import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Check if the environment variables are set and the URL is valid.
// This prevents the app from crashing with a cryptic error message.
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SUPABASE_URL.startsWith('http')) {
  // If the variables are missing, we throw a custom, more informative error.
  // This helps the user understand that the issue is with the environment setup,
  // not with the code itself. The app will not render, but the console will show this clear message.
  throw new Error(
    "Supabase Configuration Error: The application is not correctly connected to a Supabase project. " +
    "Please ensure that VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are available as environment variables. " +
    "You may need to connect your Supabase project in the platform settings."
  );
}

// If the checks pass, create and export the Supabase client.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
