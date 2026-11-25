import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isProvider,
  providerConfigured,
  makePkce,
  makeState,
  buildAuthorizeUrl,
} from "@/lib/social";

// GET /api/social/:provider/connect
// Kicks off the OAuth flow: sets a CSRF state + PKCE verifier in short-lived
// cookies, then redirects the user to the provider's consent screen.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const { origin } = new URL(request.url);

  if (!isProvider(provider)) {
    return NextResponse.redirect(`${origin}/account?social=error`);
  }

  // Must be signed in to connect an account.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Not configured yet → send the user to the setup note instead of a broken
  // provider screen.
  if (!providerConfigured(provider)) {
    return NextResponse.redirect(
      `${origin}/account?social=setup&provider=${provider}`,
    );
  }

  const state = makeState();
  const { verifier, challenge } = makePkce();
  const redirectUri = `${origin}/api/social/${provider}/callback`;

  const authorizeUrl = buildAuthorizeUrl(provider, {
    redirectUri,
    state,
    codeChallenge: challenge,
  });

  const res = NextResponse.redirect(authorizeUrl);
  const secure = origin.startsWith("https://");
  const cookieOpts = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes to complete the flow
  };
  res.cookies.set(`social_state_${provider}`, state, cookieOpts);
  res.cookies.set(`social_verifier_${provider}`, verifier, cookieOpts);
  return res;
}
