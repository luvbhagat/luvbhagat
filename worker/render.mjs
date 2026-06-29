// Cliporo AI — worker (run locally with: npm run worker)
//
// Two jobs, run on each invocation:
//
//  1) YouTube imports (status "importing"): the whole pipeline in one pass —
//     download the video to a temp file with yt-dlp, transcribe it, find the
//     best moments with Claude, render every short, upload ONLY the finished
//     clips, then delete the temp file. The source video is never stored in
//     Supabase. Billed by the source video's length (see IMPORT_COST_PER_MIN).
//
//  2) Queued clips (status "queued"): the manual upload flow — re-download the
//     stored source and render the one clip the user asked for.
//
// Requires yt-dlp + ffmpeg on PATH (imports), and ffmpeg (renders).
//
// Env (loaded via --env-file=.env.local in the npm script):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (master key — local use only)
//   ASSEMBLYAI_API_KEY          (transcription)
//   ANTHROPIC_API_KEY           (clip detection)
//   BGUTIL_POT_SERVER_HOME / BGUTIL_POT_BASE_URL  (YouTube PO token, see .env.example)

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ASSEMBLY_KEY = process.env.ASSEMBLYAI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// Keep in sync with src/lib/credits.ts. One credit per minute of source video,
// charged up front for the whole import (download + transcribe + render).
const IMPORT_COST_PER_MIN = 1;
const importCost = (durationSec) =>
  Math.max(1, Math.ceil((durationSec || 0) / 60) * IMPORT_COST_PER_MIN);

// YouTube now requires a Proof-of-Origin (PO) token. We run the bgutil POT
// provider as a local HTTP server (reliable — no per-call cold start) and let
// yt-dlp talk to it. BGUTIL_POT_BASE_URL is where it listens; BGUTIL_POT_SERVER_HOME
// (the built provider's "server" folder) lets the worker auto-start it. See
// .env.example.
const POT_BASE_URL = process.env.BGUTIL_POT_BASE_URL || "http://127.0.0.1:4416";
const POT_SERVER_HOME = process.env.BGUTIL_POT_SERVER_HOME;
const YTDLP_BASE_ARGS = [
  "--extractor-args",
  `youtubepot-bgutilhttp:base_url=${POT_BASE_URL}`,
];

async function potAlive() {
  try {
    const r = await fetch(`${POT_BASE_URL}/ping`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

// Make sure the PO token server is up before importing. If it isn't and we know
// where it's installed, start it (detached) and wait for it to answer.
async function ensurePotServer() {
  if (await potAlive()) return;
  if (!POT_SERVER_HOME) {
    throw new Error(
      "PO token server isn't running and BGUTIL_POT_SERVER_HOME isn't set. " +
        "Start it (node <server>/build/main.js) or set the env var. See .env.example.",
    );
  }
  const port = new global.URL(POT_BASE_URL).port || "4416";
  console.log("Starting PO token server…");
  const child = spawn(process.execPath, [join(POT_SERVER_HOME, "build", "main.js"), "--port", port], {
    cwd: POT_SERVER_HOME,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  for (let i = 0; i < 20; i++) {
    if (await potAlive()) {
      console.log("  ✓ PO token server ready");
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("PO token server did not start in time");
}

if (!URL || !KEY) {
  console.error(
    "Missing env. Run with: npm run worker (which loads .env.local).\n" +
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const RENDER_COST = 10; // keep in sync with src/lib/credits.ts

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false },
});

// #RRGGBB -> ASS &HAABBGGRR (white fallback)
function assColor(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex ?? "");
  if (!m) return "&H00FFFFFF";
  const r = m[1].slice(0, 2);
  const g = m[1].slice(2, 4);
  const b = m[1].slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

// centiseconds -> ASS time h:mm:ss.cc
function assTime(cs) {
  const c = Math.max(0, Math.round(cs));
  const h = Math.floor(c / 360000);
  const m = Math.floor((c % 360000) / 6000);
  const s = Math.floor((c % 6000) / 100);
  const cc = c % 100;
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${h}:${p(m)}:${p(s)}.${p(cc)}`;
}

function escapeAss(t) {
  return String(t).replace(/[{}]/g, "").replace(/\n/g, " ");
}

function buildAss(clip) {
  const cfg = clip.edit_config ?? {};
  const captions = cfg.captions ?? {};
  const style = captions.style ?? "karaoke";
  const position = captions.position ?? "bottom";
  const accent = assColor(captions.accent ?? "#5fd0ff");

  const startSec = Number(clip.start_sec);
  const endSec = Number(clip.end_sec);
  const words = (clip.transcript_slice?.words ?? []).filter(
    (w) => w.start / 1000 >= startSec - 0.05 && w.end / 1000 <= endSec + 0.05,
  );

  const align = position === "top" ? 8 : position === "center" ? 5 : 2;
  const marginV = position === "center" ? 0 : position === "top" ? 180 : 240;

  // Karaoke fills white -> accent; clean stays white.
  const primary = style === "clean" ? "&H00FFFFFF" : accent; // "sung" color
  const secondary = "&H00FFFFFF"; // pre-sung color

  const header =
    "[Script Info]\n" +
    "ScriptType: v4.00+\n" +
    "PlayResX: 1080\n" +
    "PlayResY: 1920\n" +
    "WrapStyle: 2\n\n" +
    "[V4+ Styles]\n" +
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, " +
    "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, " +
    "ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, " +
    "MarginL, MarginR, MarginV, Encoding\n" +
    `Style: Cap,Arial,88,${primary},${secondary},&H00000000,&H64000000,` +
    `-1,0,0,0,100,100,0,0,1,4,2,${align},80,80,${marginV},1\n\n` +
    "[Events]\n" +
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, " +
    "Effect, Text\n";

  // Group into lines of up to 5 words.
  const lines = [];
  const N = 5;
  for (let i = 0; i < words.length; i += N) {
    lines.push(words.slice(i, i + N));
  }

  const events = lines
    .map((line) => {
      const relStart = line[0].start / 1000 - startSec;
      const relEnd = line[line.length - 1].end / 1000 - startSec;
      let text;
      if (style === "clean") {
        text = line.map((w) => escapeAss(w.text)).join(" ");
      } else {
        // \kf<cs> highlights each word in sequence (karaoke fill).
        text = line
          .map((w) => {
            const durCs = Math.max(1, Math.round((w.end - w.start) / 10));
            return `{\\kf${durCs}}${escapeAss(w.text)} `;
          })
          .join("");
      }
      return `Dialogue: 0,${assTime(relStart * 100)},${assTime(
        relEnd * 100,
      )},Cap,,0,0,0,,${text}`;
    })
    .join("\n");

  return header + events + "\n";
}

function runFfmpeg(args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", args, { cwd });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("error", (e) =>
      reject(
        new Error(
          e.code === "ENOENT"
            ? "FFmpeg not found. Install it and ensure it's on your PATH."
            : e.message,
        ),
      ),
    );
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(err.slice(-1500))),
    );
  });
}

// Run a command, capturing stdout. Rejects with a friendly message if the
// binary is missing, otherwise with the tail of stderr.
function run(cmd, args, { cwd, missingHint } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("error", (e) =>
      reject(
        new Error(
          e.code === "ENOENT"
            ? missingHint ?? `${cmd} not found. Install it and add it to PATH.`
            : e.message,
        ),
      ),
    );
    p.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error((err || out).slice(-1500))),
    );
  });
}

const YT_DLP_HINT =
  "yt-dlp not found. Install it (https://github.com/yt-dlp/yt-dlp) and make " +
  "sure it's on your PATH. On Windows: winget install yt-dlp.";

// Read a media file's duration in seconds via ffprobe (null if it can't).
async function probeDurationSec(dir, file) {
  try {
    const out = await run(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of",
        "default=noprint_wrappers=1:nokey=1", file],
      { cwd: dir },
    );
    const d = parseFloat(out.trim());
    return Number.isFinite(d) ? d : null;
  } catch {
    return null;
  }
}

// ---- Transcription (AssemblyAI, no Supabase storage) ----------------------
// We upload the audio straight to AssemblyAI's own upload endpoint and feed the
// returned URL to a transcript job — so the source never touches Supabase.

async function assemblyTranscribe(dir) {
  if (!ASSEMBLY_KEY) throw new Error("ASSEMBLYAI_API_KEY is not set in .env.local");

  // Audio-only keeps the upload small and fast.
  await runFfmpeg(
    ["-y", "-i", "input.mp4", "-vn", "-c:a", "aac", "-b:a", "128k", "audio.m4a"],
    dir,
  );

  const upRes = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: { authorization: ASSEMBLY_KEY, "content-type": "application/octet-stream" },
    body: readFileSync(join(dir, "audio.m4a")),
  });
  const up = await upRes.json();
  if (!upRes.ok || !up.upload_url) {
    throw new Error(up.error ?? "Could not upload audio to AssemblyAI");
  }

  const startRes = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: { authorization: ASSEMBLY_KEY, "content-type": "application/json" },
    body: JSON.stringify({ audio_url: up.upload_url }),
  });
  const started = await startRes.json();
  if (!startRes.ok || !started.id) {
    throw new Error(started.error ?? "Transcription failed to start");
  }

  // Poll until done. Long videos can take a while; cap at ~30 min.
  for (let i = 0; i < 360; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const pRes = await fetch(
      `https://api.assemblyai.com/v2/transcript/${started.id}`,
      { headers: { authorization: ASSEMBLY_KEY } },
    );
    const t = await pRes.json();
    if (t.status === "completed") {
      const words = (t.words ?? []).map((w) => ({
        text: w.text,
        start: w.start,
        end: w.end,
      }));
      return {
        id: started.id,
        text: t.text ?? "",
        words,
        durationSec: t.audio_duration ? Math.round(t.audio_duration) : null,
      };
    }
    if (t.status === "error") {
      throw new Error(t.error ?? "Transcription error");
    }
  }
  throw new Error("Transcription timed out");
}

// ---- Clip detection (Claude) — mirrors src/app/api/videos/[id]/detect ------

const toSec = (ms) => ms / 1000;

function buildTimedTranscript(words) {
  const lines = [];
  const CHUNK = 12;
  for (let i = 0; i < words.length; i += CHUNK) {
    const group = words.slice(i, i + CHUNK);
    const start = toSec(group[0].start).toFixed(1);
    const text = group.map((w) => w.text).join(" ");
    lines.push(`[${start}s] ${text}`);
  }
  return lines.join("\n");
}

function sliceWords(words, startSec, endSec) {
  const within = words.filter(
    (w) => toSec(w.start) >= startSec && toSec(w.end) <= endSec,
  );
  return { text: within.map((w) => w.text).join(" "), words: within };
}

// Ask Claude for the best short-form moments. Returns validated clip rows
// (without the DB-only fields, which the caller adds).
async function detectClips(words) {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY is not set in .env.local");
  const timed = buildTimedTranscript(words);
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

  const tool = {
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
  const detected = toolUse?.type === "tool_use" ? toolUse.input.clips ?? [] : [];
  const totalSec = words.length > 0 ? toSec(words[words.length - 1].end) : 0;

  return detected
    .map((c) => {
      const startSec = Math.max(0, Math.min(c.startSec, totalSec));
      const endSec = Math.max(startSec + 1, Math.min(c.endSec, totalSec));
      return {
        start_sec: Number(startSec.toFixed(2)),
        end_sec: Number(endSec.toFixed(2)),
        score: Math.max(0, Math.min(100, Math.round(c.score))),
        title: String(c.title).slice(0, 200),
        transcript_slice: sliceWords(words, startSec, endSec),
      };
    })
    .filter((r) => r.end_sec - r.start_sec >= 5);
}

// ---- Rendering -------------------------------------------------------------

// Cut + caption one clip from a local source file and upload the MP4 to the
// "renders" bucket. Returns the storage key. Shared by both pipelines.
async function renderClipToStorage(dir, inputFile, clip) {
  writeFileSync(join(dir, "subs.ass"), buildAss(clip));

  const start = Number(clip.start_sec);
  const dur = Math.max(1, Number(clip.end_sec) - start);

  await runFfmpeg(
    [
      "-y",
      "-ss", String(start),
      "-i", inputFile,
      "-t", String(dur),
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=increase," +
        "crop=1080:1920,ass=subs.ass",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart",
      "out.mp4",
    ],
    dir,
  );

  const key = `${clip.user_id}/${clip.id}.mp4`;
  const { error: uErr } = await supabase.storage
    .from("renders")
    .upload(key, readFileSync(join(dir, "out.mp4")), {
      contentType: "video/mp4",
      upsert: true,
    });
  if (uErr) throw new Error(`Upload failed: ${uErr.message}`);
  return key;
}

// ---- YouTube import: the whole pipeline, source never stored ---------------

async function processImport(video) {
  console.log(`Importing ${video.id} — ${video.source_url}`);
  const dir = mkdtempSync(join(tmpdir(), "cliporo-yt-"));
  let charged = 0;
  try {
    // 1) Metadata (title + duration) so we can label and bill the project.
    const meta = await run(
      "yt-dlp",
      [...YTDLP_BASE_ARGS, "--no-warnings", "--skip-download",
        "--print", "%(title)s", "--print", "%(duration)s", video.source_url],
      { cwd: dir, missingHint: YT_DLP_HINT },
    );
    const [rawTitle, rawDuration] = meta.trim().split("\n");
    const title = (rawTitle || "").trim() || video.source_url;
    let duration = Number.parseInt(rawDuration, 10);

    await supabase
      .from("videos")
      .update({ title, duration_sec: Number.isFinite(duration) ? duration : null })
      .eq("id", video.id);

    // 2) Download to a temp mp4 (<=1080p; clips render at 1080x1920).
    console.log("  Downloading…");
    await run(
      "yt-dlp",
      [...YTDLP_BASE_ARGS, "--no-warnings", "-f",
        "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/" +
          "best[ext=mp4][height<=1080]/best[height<=1080]/best",
        "--merge-output-format", "mp4", "-o", "input.mp4", video.source_url],
      { cwd: dir, missingHint: YT_DLP_HINT },
    );

    // Fall back to probing the file if metadata had no duration.
    if (!Number.isFinite(duration)) {
      duration = Math.round((await probeDurationSec(dir, "input.mp4")) || 0);
    }

    // 3) Bill by length, before doing any paid work. Friendly error if short.
    const cost = importCost(duration);
    const { error: spendErr } = await supabase.rpc("spend_credits_for", {
      p_user: video.user_id,
      p_amount: cost,
      p_reason: "youtube_import",
      p_ref: video.id,
    });
    if (spendErr) {
      if (spendErr.message.includes("insufficient_credits")) {
        throw new Error(
          `Not enough credits — this video needs ${cost} ` +
            `(1 per minute). Buy more from the Account tab and try again.`,
        );
      }
      throw new Error(spendErr.message);
    }
    charged = cost;
    console.log(`  Charged ${cost} credit(s) for ${duration}s.`);

    // 4) Transcribe (audio uploaded straight to AssemblyAI).
    await supabase.from("videos").update({ status: "transcribing" }).eq("id", video.id);
    console.log("  Transcribing…");
    const t = await assemblyTranscribe(dir);
    await supabase
      .from("videos")
      .update({
        assemblyai_id: t.id,
        transcript: { text: t.text, words: t.words },
        duration_sec: t.durationSec ?? (Number.isFinite(duration) ? duration : null),
        error: null,
      })
      .eq("id", video.id);
    if (t.words.length === 0) throw new Error("No speech was found in this video");

    // 5) Find the best moments.
    await supabase.from("videos").update({ status: "analyzing" }).eq("id", video.id);
    console.log("  Finding clips…");
    const defs = await detectClips(t.words);
    if (defs.length === 0) throw new Error("No usable clips were found in this video");

    const { data: clips, error: insErr } = await supabase
      .from("clips")
      .insert(
        defs.map((d) => ({
          ...d,
          video_id: video.id,
          user_id: video.user_id,
          status: "rendering",
        })),
      )
      .select("*");
    if (insErr || !clips) throw new Error(insErr?.message ?? "Could not save clips");

    // 6) Render every short from the temp source, store only the results.
    await supabase.from("videos").update({ status: "rendering" }).eq("id", video.id);
    console.log(`  Rendering ${clips.length} short(s)…`);
    let ok = 0;
    for (const clip of clips) {
      try {
        const key = await renderClipToStorage(dir, "input.mp4", clip);
        await supabase
          .from("clips")
          .update({ status: "ready", output_key: key })
          .eq("id", clip.id);
        ok++;
        console.log(`    ✓ ${clip.title}`);
      } catch (e) {
        console.error(`    ✗ ${clip.title}: ${e.message}`);
        await supabase.from("clips").update({ status: "failed" }).eq("id", clip.id);
      }
    }
    if (ok === 0) throw new Error("Every short failed to render");

    // 7) Done.
    await supabase
      .from("videos")
      .update({ status: "ready", error: null })
      .eq("id", video.id);
    console.log(`  ✓ imported "${title}" — ${ok}/${clips.length} short(s) ready`);
  } catch (e) {
    console.error(`  ✗ import failed: ${e.message}`);
    if (charged > 0) {
      await supabase.rpc("grant_credits", {
        p_user: video.user_id,
        p_amount: charged,
        p_reason: "refund",
        p_ref: video.id,
      });
    }
    await supabase
      .from("videos")
      .update({ status: "failed", error: e.message.slice(0, 500) })
      .eq("id", video.id);
  } finally {
    // Always delete the temp source — we only keep metadata, transcript, clips.
    rmSync(dir, { recursive: true, force: true });
  }
}

async function importPending() {
  const { data: pending, error } = await supabase
    .from("videos")
    .select("id, user_id, source_url")
    .eq("status", "importing")
    .not("source_url", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!pending || pending.length === 0) return;

  await ensurePotServer();
  console.log(`Found ${pending.length} YouTube import(s).`);
  for (const video of pending) {
    await processImport(video);
  }
}

// ---- Queued clips (manual upload flow): render one stored clip --------------

async function renderClip(clip) {
  console.log(`Rendering clip ${clip.id} — "${clip.title}"`);
  await supabase.from("clips").update({ status: "rendering" }).eq("id", clip.id);

  const { data: video, error: vErr } = await supabase
    .from("videos")
    .select("storage_path")
    .eq("id", clip.video_id)
    .single();
  if (vErr || !video || !video.storage_path) {
    throw new Error("Source video not found");
  }

  const dir = mkdtempSync(join(tmpdir(), "cliporo-"));
  try {
    const { data: blob, error: dErr } = await supabase.storage
      .from("videos")
      .download(video.storage_path);
    if (dErr || !blob) throw new Error("Could not download source video");
    writeFileSync(join(dir, "input.mp4"), Buffer.from(await blob.arrayBuffer()));

    const key = await renderClipToStorage(dir, "input.mp4", clip);
    await supabase
      .from("clips")
      .update({ status: "ready", output_key: key })
      .eq("id", clip.id);
    console.log(`  ✓ ready -> ${key}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  // 1) Run any YouTube imports end-to-end.
  await importPending();

  // 2) Render any queued clips from the manual upload flow.
  const { data: queued, error } = await supabase
    .from("clips")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true });
  if (error) throw error;

  if (!queued || queued.length === 0) {
    console.log("No queued clips.");
    return;
  }

  console.log(`Found ${queued.length} queued clip(s).`);
  for (const clip of queued) {
    try {
      await renderClip(clip);
    } catch (e) {
      console.error(`  ✗ failed: ${e.message}`);
      await supabase
        .from("clips")
        .update({ status: "failed" })
        .eq("id", clip.id);
      // Refund the credits charged at render time.
      await supabase.rpc("grant_credits", {
        p_user: clip.user_id,
        p_amount: RENDER_COST,
        p_reason: "refund",
        p_ref: clip.id,
      });
    }
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
