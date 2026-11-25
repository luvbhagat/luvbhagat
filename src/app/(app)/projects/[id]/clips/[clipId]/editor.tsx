"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Loader2,
  Save,
  Download,
  Crop,
  Maximize2,
  Gamepad2,
  Mic,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  Clip,
  TranscriptWord,
  CaptionStyle,
  CaptionPosition,
  ClipLayout,
  EditConfig,
} from "@/lib/types";
import { DEFAULT_ACCENT } from "@/lib/types";

const STYLES: { id: CaptionStyle; label: string }[] = [
  { id: "karaoke", label: "Karaoke Pop" },
  { id: "reveal", label: "Word Reveal" },
  { id: "bounce", label: "Bounce" },
  { id: "typewriter", label: "Typewriter" },
  { id: "clean", label: "Clean Lines" },
];
const POSITIONS: { id: CaptionPosition; label: string }[] = [
  { id: "bottom", label: "Bottom" },
  { id: "center", label: "Center" },
  { id: "top", label: "Top" },
];
const ACCENTS = ["#5fd0ff", "#ff5fa8", "#ffb347", "#7CFF6B", "#ffffff"];

const LAYOUTS: {
  id: ClipLayout;
  label: string;
  hint: string;
  icon: typeof Crop;
}[] = [
  { id: "fill", label: "Fill", hint: "Center crop", icon: Crop },
  { id: "fit", label: "Fit to screen", hint: "Blurred bg", icon: Maximize2 },
  { id: "gaming", label: "Gaming", hint: "Cam + gameplay", icon: Gamepad2 },
  { id: "podcast", label: "Podcast", hint: "Centered", icon: Mic },
];

// Pick the ~6-word window to show, and which word is "active" right now.
function captionWindow(words: TranscriptWord[], tMs: number) {
  if (words.length === 0) return { window: [], activeId: -1, lineStart: 0 };
  let active = words.findIndex((w) => tMs >= w.start && tMs <= w.end);
  if (active === -1) {
    active = words.findIndex((w) => w.start > tMs);
    if (active === -1) active = words.length - 1;
  }
  const lineStart = Math.max(0, active - 2);
  return {
    window: words.slice(lineStart, lineStart + 6),
    activeId: active,
    lineStart,
  };
}

// Re-map edited caption text onto the original word timings (by index) so
// captions still sync after the user fixes a typo.
function remapWords(
  text: string,
  baseWords: TranscriptWord[],
): TranscriptWord[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  return tokens.map((tok, i) => {
    const base =
      baseWords[Math.min(i, baseWords.length - 1)] ??
      ({ start: i * 320, end: i * 320 + 300 } as TranscriptWord);
    return { text: tok, start: base.start, end: base.end };
  });
}

export function ClipEditor({
  clip,
  videoUrl,
}: {
  clip: Clip;
  videoUrl: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgRef = useRef<HTMLVideoElement>(null); // second copy for bg / top panel

  const baseWords = clip.transcript_slice?.words ?? [];

  const [startSec, setStartSec] = useState(Number(clip.start_sec));
  const [endSec, setEndSec] = useState(Number(clip.end_sec));
  const [layout, setLayout] = useState<ClipLayout>(
    clip.edit_config?.layout ?? "fill",
  );
  const [style, setStyle] = useState<CaptionStyle>(
    clip.edit_config?.captions.style ?? "karaoke",
  );
  const [position, setPosition] = useState<CaptionPosition>(
    clip.edit_config?.captions.position ?? "bottom",
  );
  const [accent, setAccent] = useState(
    clip.edit_config?.captions.accent ?? DEFAULT_ACCENT,
  );
  const [size, setSize] = useState(clip.edit_config?.captions.size ?? 1);

  // Editable caption text (defaults to the saved override or the transcript).
  const initialWords = clip.edit_config?.captions.words ?? baseWords;
  const [captionText, setCaptionText] = useState(
    initialWords.map((w) => w.text).join(" "),
  );
  const words = remapWords(captionText, baseWords);

  const [playing, setPlaying] = useState(false);
  const [tMs, setTMs] = useState(startSec * 1000);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [renderMsg, setRenderMsg] = useState<string | null>(null);

  // Keep playback inside the trimmed window, loop, and keep the bg copy in sync.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    function onTime() {
      if (!v) return;
      if (v.currentTime < startSec) v.currentTime = startSec;
      if (v.currentTime >= endSec) v.currentTime = startSec;
      setTMs(v.currentTime * 1000);
      const bg = bgRef.current;
      if (bg && Math.abs(bg.currentTime - v.currentTime) > 0.3) {
        bg.currentTime = v.currentTime;
      }
    }
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
    // `layout` is included because switching layouts swaps the <video> element,
    // so we must re-attach the listener to the new node.
  }, [startSec, endSec, layout]);

  function togglePlay() {
    const v = videoRef.current;
    const bg = bgRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < startSec || v.currentTime >= endSec) {
        v.currentTime = startSec;
      }
      void v.play();
      if (bg) {
        bg.currentTime = v.currentTime;
        void bg.play().catch(() => {});
      }
      setPlaying(true);
    } else {
      v.pause();
      bg?.pause();
      setPlaying(false);
    }
  }

  const { window: win, activeId, lineStart } = captionWindow(words, tMs);

  async function handleSave() {
    setSaving(true);
    setSavedMsg(null);
    const edited = remapWords(captionText, baseWords);
    const unchanged =
      edited.map((w) => w.text).join(" ") ===
      baseWords.map((w) => w.text).join(" ");
    const config: EditConfig = {
      trim: { startSec, endSec },
      layout,
      captions: {
        style,
        position,
        accent,
        size,
        words: unchanged ? null : edited,
      },
    };
    const { error } = await supabase
      .from("clips")
      .update({
        start_sec: Number(startSec.toFixed(2)),
        end_sec: Number(endSec.toFixed(2)),
        edit_config: config,
      })
      .eq("id", clip.id);
    setSaving(false);
    if (error) {
      setSavedMsg(`Could not save: ${error.message}`);
    } else {
      setSavedMsg("Saved.");
      router.refresh();
    }
  }

  async function handleRender() {
    setRenderMsg(null);
    const res = await fetch(`/api/clips/${clip.id}/render`, { method: "POST" });
    const json = (await res.json()) as { error?: string; message?: string };
    setRenderMsg(json.message ?? json.error ?? "Render requested.");
  }

  const posClass =
    position === "top"
      ? "top-[12%]"
      : position === "center"
        ? "top-1/2 -translate-y-1/2"
        : "bottom-[14%]";

  // Caption line, styled per animation preset.
  const captionLine = win.length > 0 && (
    <div className={cn("absolute inset-x-0 z-20 px-4 text-center", posClass)}>
      <p
        className="font-display font-extrabold leading-tight [text-shadow:_0_2px_8px_rgb(0_0_0_/_0.9)]"
        style={{ fontSize: `${1.5 * size}rem` }}
      >
        {win.map((w, i) => {
          const idx = lineStart + i;
          const isActive = idx === activeId;
          // reveal + typewriter hide/dim upcoming words
          const revealed =
            style === "reveal" || style === "typewriter"
              ? idx <= activeId
              : true;
          const colored = isActive && style !== "clean";
          return (
            <span
              key={`${w.start}-${i}`}
              style={{
                color: colored ? accent : "#ffffff",
                opacity:
                  style === "typewriter" && idx > activeId
                    ? 0
                    : revealed
                      ? 1
                      : 0.25,
                display: "inline-block",
                transform:
                  isActive && style === "karaoke"
                    ? "scale(1.12)"
                    : isActive && style === "bounce"
                      ? "translateY(-4px) scale(1.06)"
                      : "scale(1)",
                transition: "transform 120ms, opacity 120ms, color 120ms",
                marginRight: "0.3em",
              }}
            >
              {w.text}
            </span>
          );
        })}
        {style === "typewriter" && (
          <span className="animate-pulse" style={{ color: accent }}>
            |
          </span>
        )}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* 9:16 live preview */}
      <div className="mx-auto w-full max-w-[300px]">
        <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-black shadow-xl">
          {/* Background copy (blurred) for fit / podcast */}
          {(layout === "fit" || layout === "podcast") && (
            <video
              ref={bgRef}
              src={videoUrl}
              muted
              playsInline
              preload="metadata"
              className={cn(
                "absolute inset-0 h-full w-full object-cover scale-110",
                layout === "podcast"
                  ? "blur-2xl brightness-50"
                  : "blur-xl brightness-75",
              )}
            />
          )}

          {layout === "gaming" ? (
            <>
              {/* Top: facecam (approx — top-center region of the source) */}
              <video
                ref={bgRef}
                src={videoUrl}
                muted
                playsInline
                preload="metadata"
                className="absolute inset-x-0 top-0 h-1/2 w-full object-cover object-top"
                style={{ objectPosition: "center top" }}
              />
              {/* Bottom: gameplay (the main, timed copy) */}
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                preload="metadata"
                className="absolute inset-x-0 bottom-0 h-1/2 w-full object-cover"
                style={{ objectPosition: "center bottom" }}
              />
              <div className="absolute inset-x-0 top-1/2 z-10 h-px -translate-y-px bg-white/20" />
            </>
          ) : (
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              preload="metadata"
              className={cn(
                "absolute inset-0 h-full w-full",
                layout === "fill"
                  ? "object-cover"
                  : layout === "podcast"
                    ? "inset-[14%_6%] h-[72%] w-[88%] rounded-xl object-cover"
                    : "object-contain",
              )}
            />
          )}

          {captionLine}

          {/* Play/pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 z-30 flex items-center justify-center"
            aria-label={playing ? "Pause" : "Play"}
          >
            {!playing && (
              <span className="flex size-14 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
                <Play className="size-7" />
              </span>
            )}
          </button>
        </div>

        <div className="mt-2 flex justify-center">
          <Button variant="ghost" size="sm" onClick={togglePlay}>
            {playing ? (
              <>
                <Pause className="size-4" /> Pause
              </>
            ) : (
              <>
                <Play className="size-4" /> Play preview
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Layout */}
      <section className="glass flex flex-col gap-3 rounded-2xl p-4">
        <p className="text-sm font-medium">Layout</p>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUTS.map((l) => {
            const Icon = l.icon;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setLayout(l.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  layout === l.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-secondary",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    layout === l.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{l.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {l.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Caption text (editable) */}
      <section className="glass flex flex-col gap-3 rounded-2xl p-4">
        <p className="text-sm font-medium">Caption text</p>
        <textarea
          value={captionText}
          onChange={(e) => setCaptionText(e.target.value)}
          rows={3}
          spellCheck
          className="w-full resize-none rounded-lg border bg-transparent p-3 text-sm outline-none focus-visible:border-ring"
          placeholder="Caption words…"
        />
        <p className="text-xs text-muted-foreground">
          Fix any transcription typos here — timing stays in sync with the
          video.
        </p>
      </section>

      {/* Caption style + preview */}
      <section className="glass flex flex-col gap-3 rounded-2xl p-4">
        <p className="text-sm font-medium">Caption style</p>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border px-3 py-2 transition-colors",
                style === s.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary",
              )}
            >
              <span className="text-sm font-medium">{s.label}</span>
              {/* tiny static preview of the look */}
              <span className="font-display text-xs font-bold">
                <span className="text-muted-foreground">the </span>
                <span
                  style={{
                    color: s.id === "clean" ? undefined : accent,
                    transform:
                      s.id === "karaoke" || s.id === "bounce"
                        ? "scale(1.15)"
                        : undefined,
                    display: "inline-block",
                  }}
                  className={s.id === "clean" ? "text-foreground" : undefined}
                >
                  best
                </span>
                {s.id === "typewriter" ? (
                  <span style={{ color: accent }}>|</span>
                ) : (
                  <span className="text-muted-foreground"> bit</span>
                )}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-1 text-sm font-medium">Position</p>
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPosition(p.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm",
                position === p.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="mt-1 text-sm font-medium">Highlight color</p>
        <div className="flex gap-2">
          {ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAccent(c)}
              aria-label={`Accent ${c}`}
              className={cn(
                "size-7 rounded-full border-2",
                accent === c ? "border-foreground" : "border-transparent",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <label className="mt-1 flex flex-col gap-1 text-sm font-medium">
          Caption size
          <input
            type="range"
            min={0.7}
            max={1.6}
            step={0.1}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="accent-[var(--brand-pink)]"
          />
        </label>
      </section>

      {/* Trim */}
      <section className="glass flex flex-col gap-3 rounded-2xl p-4">
        <p className="text-sm font-medium">
          Trim ({(endSec - startSec).toFixed(1)}s)
        </p>
        <label className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          Start
          <input
            type="number"
            step="0.1"
            value={startSec.toFixed(1)}
            onChange={(e) =>
              setStartSec(Math.min(Number(e.target.value), endSec - 1))
            }
            className="w-24 rounded-md border bg-transparent px-2 py-1 text-right text-foreground"
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          End
          <input
            type="number"
            step="0.1"
            value={endSec.toFixed(1)}
            onChange={(e) =>
              setEndSec(Math.max(Number(e.target.value), startSec + 1))
            }
            className="w-24 rounded-md border bg-transparent px-2 py-1 text-right text-foreground"
          />
        </label>
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="size-4" /> Save changes
            </>
          )}
        </Button>
        {savedMsg && (
          <p className="text-center text-xs text-brand-cyan">{savedMsg}</p>
        )}

        <Button variant="brand" onClick={handleRender}>
          <Download className="size-4" /> Render clip
        </Button>
        {renderMsg && (
          <p className="glass rounded-xl p-3 text-center text-xs text-muted-foreground">
            {renderMsg}
          </p>
        )}
      </div>
    </div>
  );
}
