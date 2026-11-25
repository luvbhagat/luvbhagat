import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isProvider, exchangeCode, fetchIdentity } from "@/lib/social";

// GET /api/social/:provider/callback
// The provider redirects back here with ?code & ?state. We verify the state,
// swap the code for tokens (PKCE), look up the account name, and save it.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const url = new URL(request.url);
  const origin = url.origin;

  const fail = (reason: string) =>
    NextResponse.redirect(
      `${origin}/account?social=error&provider=${provider}&reason=${encodeURIComponent(
        reason,
      )}`,
    );

  if (!isProvider(provider)) return fail("unknown_provider");

  // The user can decline on the provider's screen.
  if (url.searchParams.get("error")) {
    return fail(url.searchParams.get("error") ?? "denied");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("missing_code");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(`social_state_${provider}`)?.value;
  const verifier = cookieStore.get(`social_verifier_${provider}`)?.value;
  if (!expectedState || state !== expectedState || !verifier) {
    return fail("bad_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  try {
    const redirectUri = `${origin}/api/social/${provider}/callback`;
    const token = await exchangeCode(provider, {
      code,
      redirectUri,
      codeVerifier: verifier,
    });

    const identity = await fetchIdentity(provider, token.accessToken);

    const expiresAt = token.expiresInSec
      ? new Date(Date.now() + token.expiresInSec * 1000).toISOString()
      : null;

    const { error } = await supabase.from("social_connections").upsert(
      {
        user_id: user.id,
        provider,
        provider_account_id: token.providerAccountId ?? identity.id,
        username: identity.username,
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        token_expires_at: expiresAt,
        scopes: token.scopes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );
    if (error) return fail("save_failed");
  } catch (e) {
    return fail(e instanceof Error ? e.message.slice(0, 80) : "exchange_failed");
  }

  const res = NextResponse.redirect(
    `${origin}/account?social=connected&provider=${provider}`,
  );
  // Clear the one-time cookies.
  res.cookies.set(`social_state_${provider}`, "", { path: "/", maxAge: 0 });
  res.cookies.set(`social_verifier_${provider}`, "", { path: "/", maxAge: 0 });
  return res;
}
