import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Kicks off transcription for a freshly-uploaded video.
// 1) make a temporary signed URL to the file in Supabase Storage
// 2) hand that URL to AssemblyAI
// 3) save the AssemblyAI job id and mark the video "transcribing"
export async function POST(request: Request) {
  const { videoId } = (await request.json()) as { videoId?: string };
  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ASSEMBLYAI_API_KEY is not set on the server" },
      { status: 500 },
    );
  }

  // RLS ensures the user can only read their own video row.
  const { data: video } = await supabase
    .from("videos")
    .select("id, storage_path")
    .eq("id", videoId)
    .single();
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Signed URL valid for 2 hours — long enough for AssemblyAI to fetch it.
  const { data: signed, error: signErr } = await supabase.storage
    .from("videos")
    .createSignedUrl(video.storage_path, 60 * 60 * 2);
  if (signErr || !signed) {
    return NextResponse.json(
      { error: "Could not create a download link for the file" },
      { status: 500 },
    );
  }

  const res = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: { authorization: apiKey, "content-type": "application/json" },
    body: JSON.stringify({ audio_url: signed.signedUrl }),
  });
  const json = (await res.json()) as { id?: string; error?: string };

  if (!res.ok || !json.id) {
    await supabase
      .from("videos")
      .update({ status: "failed", error: json.error ?? "Transcription failed to start" })
      .eq("id", videoId);
    return NextResponse.json(
      { error: json.error ?? "Transcription failed to start" },
      { status: 502 },
    );
  }

  await supabase
    .from("videos")
    .update({ status: "transcribing", assemblyai_id: json.id, error: null })
    .eq("id", videoId);

  return NextResponse.json({ ok: true, status: "transcribing" });
}