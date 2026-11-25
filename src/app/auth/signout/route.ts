import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The "Sign out" button posts to this route. We clear the Supabase session
// and send the user back to the landing page.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, { status: 302 });
}
