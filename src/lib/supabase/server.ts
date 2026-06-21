import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// This Supabase client runs on the SERVER (in Server Components, Route
// Handlers, and the middleware). It reads/writes the login session from
// cookies so the server always knows who is logged in.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component. This can
            // be safely ignored if you have middleware refreshing sessions
            // (we do, in src/middleware.ts).
          }
        },
      },
    },
  );
}
