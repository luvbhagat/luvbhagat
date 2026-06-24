// Cliporo AI — render worker (run locally with: npm run worker)
//
// Picks up clips with status "queued", renders each to a 1080x1920 MP4 with
// captions burned in via FFmpeg, uploads the result to Supabase Storage, and
// marks the clip "ready". Requires FFmpeg installed and on your PATH.
//
// Env (loaded via --env-file=.env.local in the npm script):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (master key — local use only)

import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function renderClip(clip) {
  console.log(`Rendering clip ${clip.id} — "${clip.title}"`);
  await supabase.from("clips").update({ status: "rendering" }).eq("id", clip.id);

  const { data: video, error: vErr } = await supabase
    .from("videos")
    .select("storage_path")
    .eq("id", clip.video_id)
    .single();
  if (vErr || !video) throw new Error("Source video not found");

  const dir = mkdtempSync(join(tmpdir(), "cliporo-"));
  try {
    const { data: blob, error: dErr } = await supabase.storage
      .from("videos")
      .download(video.storage_path);
    if (dErr || !blob) throw new Error("Could not download source video");
    writeFileSync(join(dir, "input.mp4"), Buffer.from(await blob.arrayBuffer()));
    writeFileSync(join(dir, "subs.ass"), buildAss(clip));

    const start = Number(clip.start_sec);
    const dur = Math.max(1, Number(clip.end_sec) - start);

    await runFfmpeg(
      [
        "-y",
        "-ss", String(start),
        "-i", "input.mp4",
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
  const { data: queued, error } = await supabase
    .from("clips")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true });
  if (error) throw error;

  if (!queued || queued.length === 0) {
    console.log("No queued clips. Queue one from the editor (Render clip).");
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