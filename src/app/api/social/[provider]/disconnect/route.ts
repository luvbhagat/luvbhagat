import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isProvider } from "@/lib/social";

// POST /api/social/:provider/disconnect
// Removes the stored connection (and its tokens) for this user + provider.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const { origin } = new URL(request.url);

  if (!isProvider(provider)) {
    return NextResponse.redirect(`${origin}/account?social=error`, {
      status: 303,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`, { status: 303 });
  }

  await supabase
    .from("social_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  return NextResponse.redirect(
    `${origin}/account?social=disconnected&provider=${provider}`,
    { status: 303 },
  );
}
