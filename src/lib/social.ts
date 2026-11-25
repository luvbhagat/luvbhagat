// Social OAuth provider registry + helpers.
//
// SERVER-ONLY: this module reads client secrets from env. It is imported only
// by route handlers under /api/social/* — never by a client component.
//
// Each provider is standard OAuth 2.0 (authorization code + PKCE). The quirks
// (TikTok uses `client_key`; scope separators differ; identity endpoints
// differ) are handled per-provider below.

import { createHash, randomBytes } from "node:crypto";
import type { SocialProvider } from "./types";

type ProviderDef = {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
  scopeSeparator: string; // " " for Google/Meta, "," for TikTok
  clientIdParam: "client_id" | "client_key";
  clientIdEnv: string;
  clientSecretEnv: string;
  extraAuthParams?: Record<string, string>;
};

export const PROVIDERS: Record<SocialProvider, ProviderDef> = {
  youtube: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes:
      "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    scopeSeparator: " ",
    clientIdParam: "client_id",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    // access_type=offline + prompt=consent so Google returns a refresh token.
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  tiktok: {
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: "user.info.basic,video.upload,video.publish",
    scopeSeparator: ",",
    clientIdParam: "client_key",
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
  },
  instagram: {
    // Instagram publishing goes through the Facebook Graph API.
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes:
      "instagram_basic,instagram_content_publish,pages_show_list,business_management",
    scopeSeparator: ",",
    clientIdParam: "client_id",
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
  },
};

export function isProvider(x: string): x is SocialProvider {
  return x === "youtube" || x === "tiktok" || x === "instagram";
}

function clientId(p: SocialProvider) {
  return process.env[PROVIDERS[p].clientIdEnv];
}
function clientSecret(p: SocialProvider) {
  return process.env[PROVIDERS[p].clientSecretEnv];
}

// A provider is usable only once both its keys are set in the environment.
export function providerConfigured(p: SocialProvider): boolean {
  return Boolean(clientId(p) && clientSecret(p));
}

// ── PKCE helpers ────────────────────────────────────────────────────────────
function base64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function makePkce() {
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}
export function makeState() {
  return base64url(randomBytes(24));
}

// ── Authorize URL ───────────────────────────────────────────────────────────
export function buildAuthorizeUrl(
  p: SocialProvider,
  opts: { redirectUri: string; state: string; codeChallenge: string },
): string {
  const def = PROVIDERS[p];
  const params = new URLSearchParams({
    [def.clientIdParam]: clientId(p)!,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: def.scopes.split(/[ ,]+/).join(def.scopeSeparator),
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
    ...(def.extraAuthParams ?? {}),
  });
  return `${def.authorizeUrl}?${params.toString()}`;
}

// ── Token exchange ──────────────────────────────────────────────────────────
export type TokenResult = {
  accessToken: string;
  refreshToken: string | null;
  expiresInSec: number | null;
  providerAccountId: string | null;
  scopes: string | null;
};

export async function exchangeCode(
  p: SocialProvider,
  opts: { code: string; redirectUri: string; codeVerifier: string },
): Promise<TokenResult> {
  const def = PROVIDERS[p];
  const body = new URLSearchParams({
    [def.clientIdParam]: clientId(p)!,
    client_secret: clientSecret(p)!,
    code: opts.code,
    grant_type: "authorization_code",
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
  });

  const res = await fetch(def.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok || !json.access_token) {
    const msg =
      (json.error_description as string) ||
      (json.error as string) ||
      `Token exchange failed (${res.status})`;
    throw new Error(msg);
  }

  return {
    accessToken: String(json.access_token),
    refreshToken: json.refresh_token ? String(json.refresh_token) : null,
    expiresInSec:
      typeof json.expires_in === "number" ? (json.expires_in as number) : null,
    // TikTok returns open_id; Google/Meta identify via the identity call.
    providerAccountId: json.open_id ? String(json.open_id) : null,
    scopes: json.scope ? String(json.scope) : def.scopes,
  };
}

// ── Identity (best-effort; failures are non-fatal) ──────────────────────────
export async function fetchIdentity(
  p: SocialProvider,
  accessToken: string,
): Promise<{ id: string | null; username: string | null }> {
  try {
    if (p === "youtube") {
      const r = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const j = (await r.json()) as {
        items?: { id: string; snippet: { title: string } }[];
      };
      const ch = j.items?.[0];
      return { id: ch?.id ?? null, username: ch?.snippet?.title ?? null };
    }
    if (p === "tiktok") {
      const r = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const j = (await r.json()) as {
        data?: { user?: { open_id?: string; display_name?: string } };
      };
      return {
        id: j.data?.user?.open_id ?? null,
        username: j.data?.user?.display_name ?? null,
      };
    }
    if (p === "instagram") {
      const r = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=name&access_token=${encodeURIComponent(
          accessToken,
        )}`,
      );
      const j = (await r.json()) as { id?: string; name?: string };
      return { id: j.id ?? null, username: j.name ?? null };
    }
  } catch {
    // ignore — we'll just store the connection without a display name
  }
  return { id: null, username: null };
}
