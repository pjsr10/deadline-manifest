import { createClient } from "@supabase/supabase-js";

// Vite exposes anything prefixed VITE_ on import.meta.env, both in dev
// (from your local .env file) and in the production build (from
// whatever environment variables were set at build time).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase env vars — copy .env.example to .env and fill in your project's URL and anon key."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
