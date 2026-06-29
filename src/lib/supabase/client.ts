import { createBrowserClient } from "@supabase/ssr";

// This Supabase client runs in the BROWSER (inside "use client" components).
// It is used for things the user triggers, like clicking "Sign in".
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
