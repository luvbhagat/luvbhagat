import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// After a user logs in with Google, Supabase redirects them back here with a
// one-time "code". We swap that code for a real login session (stored in
// cookies), then send them on to the dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // "next" lets us optionally redirect somewhere specific after login.
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send them back to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
