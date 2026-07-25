"use client";

import { createBrowserClient } from "@supabase/ssr";

// Client Supabase côté navigateur (composants "use client", realtime).
// N'utilise que la clé anon/publishable, soumise au RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
