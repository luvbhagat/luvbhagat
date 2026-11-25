import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isProvider,
  providerConfigured,
  refreshAccessToken,
} from "@/lib/social";
import { uploadShortToYouTube } from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { provider?: string; privacy?: string };
const PRIVACIES = new Set(["public", "unlisted", "private"]);

// POST /api/clips/:clipId/post  { provider, privacy }
// Uploads the already-rendered MP4 to the user's connected account.
// YouTube is implemented; other providers return "coming soon" for now.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ clipId: string }> },
) {
  const { clipId } = await params;
  const { provider, privacy }: Body = await request
    .json()
    .catch(() => ({}) as Body);

  if (!provider || !isProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }
  if (provider !== "youtube") {
    return NextResponse.json(
      { error: "Posting to this platform is coming soon." },
      { status: 400 },
    );
  }
  const privacyStatus = (
    PRIVACIES.has(privacy ?? "") ? privacy : "public"
  ) as "public" | "unlisted" | "private";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!providerConfigured(provider)) {
    return NextResponse.json(
      { error: "YouTube isn't set up on this app yet (see docs/SOCIAL.md)." },
      { status: 400 },
    );
  }

  // The rendered clip.
  const { data: clip } = await supabase
    .from("clips")
    .select("id, title, status, output_key, transcript_slice")
    .eq("id", clipId)
    .single();
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }
  if (clip.status !== "ready" || !clip.output_key) {
    return NextResponse.json(
      { error: "Render this clip before posting it." },
      { status: 400 },
    );
  }

  // The connection (includes tokens — server-only read).
  const { data: conn } = await supabase
    .from("social_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .single();
  if (!conn?.access_token) {
    return NextResponse.json(
      { error: "Connect your YouTube account first (Account → Connections)." },
      { status: 400 },
    );
  }

  // Refresh the access token if it's missing an expiry or expiring soon.
  let accessToken = conn.access_token as string;
  const expMs = conn.token_expires_at
    ? new Date(conn.token_expires_at).getTime()
    : 0;
  if (expMs < Date.now() + 60_000) {
    if (!conn.refresh_token) {
      return NextResponse.json(
        { error: "YouTube session expired — reconnect in Account." },
        { status: 400 },
      );
    }
    try {
      const refreshed = await refreshAccessToken(
        provider,
        conn.refresh_token as string,
      );
      accessToken = refreshed.accessToken;
      await supabase
        .from("social_connections")
        .update({
          access_token: refreshed.accessToken,
          refresh_token: refreshed.refreshToken ?? conn.refresh_token,
          token_expires_at: refreshed.expiresInSec
            ? new Date(
                Date.now() + refreshed.expiresInSec * 1000,
              ).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("provider", provider);
    } catch {
      return NextResponse.json(
        { error: "Could not refresh YouTube access — reconnect in Account." },
        { status: 400 },
      );
    }
  }

  // Track the attempt.
  const { data: post } = await supabase
    .from("social_posts")
    .insert({
      clip_id: clip.id,
      user_id: user.id,
      provider,
      status: "posting",
    })
    .select("id")
    .single();

  try {
    // Pull the rendered MP4 from storage.
    const { data: signed } = await supabase.storage
      .from("renders")
      .createSignedUrl(clip.output_key as string, 60 * 10);
    if (!signed?.signedUrl) throw new Error("Could not read the rendered clip.");
    const mp4 = await fetch(signed.signedUrl);
    if (!mp4.ok) throw new Error("Could not download the rendered clip.");
    const bytes = Buffer.from(await mp4.arrayBuffer());

    const text = (clip.transcript_slice as { text?: string } | null)?.text ?? "";
    const result = await uploadShortToYouTube({
      accessToken,
      title: clip.title as string,
      description: `${text}\n\nMade with Cliporo AI #Shorts`.trim(),
      privacyStatus,
      bytes,
    });

    if (post?.id) {
      await supabase
        .from("social_posts")
        .update({
          status: "posted",
          remote_id: result.videoId,
          remote_url: result.url,
        })
        .eq("id", post.id);
    }

    return NextResponse.json({ ok: true, url: result.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    if (post?.id) {
      await supabase
        .from("social_posts")
        .update({ status: "failed", error: message.slice(0, 300) })
        .eq("id", post.id);
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
