// src/supabaseClient.js
// Consumer-facing Supabase client.
// Uses the anon key ONLY — never the service role key.
// RLS enforces all data access boundaries server-side.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error("Missing Supabase environment variables. Check your .env file.");
}

const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    // Persist session in localStorage — safe for consumer use
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  },
});

export default supabase;
