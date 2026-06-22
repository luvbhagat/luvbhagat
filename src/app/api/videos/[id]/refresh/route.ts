import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AssemblyWord = { text: string; start: number; end: number };
type AssemblyTranscript = {
  status: "queued" | "processing" | "completed" | "error";
  text?: string;
  words?: AssemblyWord[];
  audio_duration?: number;
  error?: string;
};

// Polled by the project page while a video is transcribing. Checks AssemblyAI
// and, when finished, saves the transcript and flips the status to "ready".
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: video } = await supabase
    .from("videos")
    .select("id, status, assemblyai_id")
    .eq("id", id)
    .single();
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Nothing to poll unless it is actively transcribing.
  if (video.status !== "transcribing" || !video.assemblyai_id) {
    return NextResponse.json({ status: video.status });
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ status: "transcribing" });
  }

  const res = await fetch(
    `https://api.assemblyai.com/v2/transcript/${video.assemblyai_id}`,
    { headers: { authorization: apiKey } },
  );
  const t = (await res.json()) as AssemblyTranscript;

  if (t.status === "completed") {
    const words = (t.words ?? []).map((w) => ({
      text: w.text,
      start: w.start,
      end: w.end,
    }));
    await supabase
      .from("videos")
      .update({
        status: "ready",
        transcript: { text: t.text ?? "", words },
        duration_sec: t.audio_duration
          ? Math.round(t.audio_duration)
          : null,
      })
      .eq("id", id);
    return NextResponse.json({ status: "ready" });
  }

  if (t.status === "error") {
    await supabase
      .from("videos")
      .update({ status: "failed", error: t.error ?? "Transcription error" })
      .eq("id", id);
    return NextResponse.json({ status: "failed" });
  }

  return NextResponse.json({ status: "transcribing" });
}