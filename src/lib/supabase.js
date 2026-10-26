import { createClient } from "@supabase/supabase-js";

let client;

export function getSupabaseClient() {
  if (client) return client;

  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;
  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file.",
    );
  }

  client = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
  return client;
}
