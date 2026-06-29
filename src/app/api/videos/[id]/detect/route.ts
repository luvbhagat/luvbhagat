import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { Transcript, TranscriptWord } from "@/lib/types";

// AssemblyAI timestamps are milliseconds; convert to seconds.
const toSec = (ms: number) => ms / 1000;

// Build a compact, line-numbered transcript with start times (in seconds) so
// Claude can choose clip boundaries by timestamp without us shipping every word.
function buildTimedTranscript(words: TranscriptWord[]): string {
  const lines: string[] = [];
  const CHUNK = 12;
  for (let i = 0; i < words.length; i += CHUNK) {
    const group = words.slice(i, i + CHUNK);
    const start = toSec(group[0].start).toFixed(1);
    const text = group.map((w) => w.text).join(" ");
    lines.push(`[${start}s] ${text}`);
  }
  return lines.join("\n");
}

// The words that fall inside a chosen clip window — stored so the editor (a
// later phase) has word-level caption timing without re-transcribing.
function sliceWords(
  words: TranscriptWord[],
  startSec: number,
  endSec: number,
): Transcript {
  const within = words.filter(
    (w) => toSec(w.start) >= startSec && toSec(w.end) <= endSec,
  );
  return { text: within.map((w) => w.text).join(" "), words: within };
}

type DetectedClip = {
  startSec: number;
  endSec: number;
  title: string;
  score: number;
  quote: string;
};

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server" },
      { status: 500 },
    );
  }

  const { data: video } = await supabase
    .from("videos")
    .select("id, status, transcript")
    .eq("id", id)
    .single();
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  if (video.status !== "ready" || !video.transcript) {
    return NextResponse.json(
      { error: "This video has not finished transcribing yet" },
      { status: 400 },
    );
  }

  const transcript = video.transcript as Transcript;
  const words = transcript.words ?? [];
  if (words.length === 0) {
    return NextResponse.json(
      { error: "No speech was found in this video" },
      { status: 400 },
    );
  }

  // Avoid duplicate detection if clips already exist.
  const { count } = await supabase
    .from("clips")
    .select("id", { count: "exact", head: true })
    .eq("video_id", id);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ ok: true, status: "already_detected" });
  }

  const timed = buildTimedTranscript(words);
  const client = new Anthropic({ apiKey });

  // Force a structured tool call so we always get clean JSON back.
  const tool: Anthropic.Tool = {
    name: "record_clips",
    description: "Record the best short-form clip candidates from the video.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        clips: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              startSec: { type: "number", description: "Clip start, in seconds" },
              endSec: { type: "number", description: "Clip end, in seconds" },
              title: { type: "string", description: "Short, punchy hook/title" },
              score: {
                type: "integer",
                description: "Engagement score 0-100 (higher = more viral)",
              },
              quote: {
                type: "string",
                description: "The strongest sentence from the clip",
              },
            },
            required: ["startSec", "endSec", "title", "score", "quote"],
          },
        },
      },
      required: ["clips"],
    },
  };

  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    tools: [tool],
    tool_choice: { type: "tool", name: "record_clips" },
    messages: [
      {
        role: "user",
        content:
          "You are an expert short-form video editor. Below is a timestamped " +
          "transcript of a long video (each line starts with its time in " +
          "seconds). Find the 3-8 best self-contained moments to turn into " +
          "vertical short clips for TikTok/Reels/Shorts.\n\n" +
          "Rules:\n" +
          "- Each clip must be 15-90 seconds long.\n" +
          "- Pick moments with a strong hook, a complete thought, and " +
          "emotional, insightful, funny, or surprising content.\n" +
          "- Snap startSec/endSec to natural sentence boundaries using the " +
          "timestamps provided.\n" +
          "- score is 0-100 for how likely the clip is to perform well.\n" +
          "- Do not overlap clips.\n\n" +
          "Transcript:\n" +
          timed,
      },
    ],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json(
      { error: "Clip detection did not return any clips" },
      { status: 502 },
    );
  }

  const detected = (toolUse.input as { clips?: DetectedClip[] }).clips ?? [];
  const totalSec = words.length > 0 ? toSec(words[words.length - 1].end) : 0;

  // Clamp + validate, then build rows to insert.
  const rows = detected
    .map((c) => {
      const startSec = Math.max(0, Math.min(c.startSec, totalSec));
      const endSec = Math.max(startSec + 1, Math.min(c.endSec, totalSec));
      return {
        video_id: id,
        user_id: user.id,
        start_sec: Number(startSec.toFixed(2)),
        end_sec: Number(endSec.toFixed(2)),
        score: Math.max(0, Math.min(100, Math.round(c.score))),
        title: c.title.slice(0, 200),
        transcript_slice: sliceWords(words, startSec, endSec),
        status: "candidate" as const,
      };
    })
    .filter((r) => r.end_sec - r.start_sec >= 5);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No usable clips were detected" },
      { status: 422 },
    );
  }

  const { error: insErr } = await supabase.from("clips").insert(rows);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}