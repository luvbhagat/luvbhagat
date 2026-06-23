"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Loader2, Save, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  Clip,
  TranscriptWord,
  CaptionStyle,
  CaptionPosition,
  EditConfig,
} from "@/lib/types";
import { DEFAULT_ACCENT } from "@/lib/types";

const STYLES: { id: CaptionStyle; label: string }[] = [
  { id: "karaoke", label: "Karaoke Pop" },
  { id: "reveal", label: "Word Reveal" },
  { id: "clean", label: "Clean Lines" },
];
const POSITIONS: { id: CaptionPosition; label: string }[] = [
  { id: "bottom", label: "Bottom" },
  { id: "center", label: "Center" },
  { id: "top", label: "Top" },
];
const ACCENTS = ["#5fd0ff", "#ff5fa8", "#ffb347", "#7CFF6B", "#ffffff"];

// Pick the ~6-word window to show, and which word is "active" right now.
function captionWindow(words: TranscriptWord[], tMs: number) {
  if (words.length === 0) return { window: [], activeId: -1, lineStart: 0 };
  let active = words.findIndex((w) => tMs >= w.start && tMs <= w.end);
  if (active === -1) {
    // between words — attach to the upcoming (or last) word
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

  const words = clip.transcript_slice?.words ?? [];

  const [startSec, setStartSec] = useState(Number(clip.start_sec));
  const [endSec, setEndSec] = useState(Number(clip.end_sec));
  const [style, setStyle] = useState<CaptionStyle>(
    clip.edit_config?.captions.style ?? "karaoke",
  );
  const [position, setPosition] = useState<CaptionPosition>(
    clip.edit_config?.captions.position ?? "bottom",
  );
  const [accent, setAccent] = useState(
    clip.edit_config?.captions.accent ?? DEFAULT_ACCENT,
  );

  const [playing, setPlaying] = useState(false);
  const [tMs, setTMs] = useState(startSec * 1000);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [renderMsg, setRenderMsg] = useState<string | null>(null);

  // Keep playback inside the trimmed window and loop.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    function onTime() {
      if (!v) return;
      if (v.currentTime < startSec) v.currentTime = startSec;
      if (v.currentTime >= endSec) v.currentTime = startSec;
      setTMs(v.currentTime * 1000);
    }
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [startSec, endSec]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < startSec || v.currentTime >= endSec) {
        v.currentTime = startSec;
      }
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  const { window: win, activeId, lineStart } = captionWindow(words, tMs);

  async function handleSave() {
    setSaving(true);
    setSavedMsg(null);
    const config: EditConfig = {
      trim: { startSec, endSec },
      captions: { style, position, accent },
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

  return (
    <div className="flex flex-col gap-5">
      {/* 9:16 live preview */}
      <div className="mx-auto w-full max-w-[300px]">
        <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-black shadow-xl">
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            preload="metadata"
          />

          {/* Caption overlay */}
          {win.length > 0 && (
            <div
              className={cn(
                "absolute inset-x-0 px-4 text-center",
                posClass,
              )}
            >
              <p className="font-display text-2xl font-extrabold leading-tight [text-shadow:_0_2px_8px_rgb(0_0_0_/_0.9)]">
                {win.map((w, i) => {
                  const idx = lineStart + i;
                  const isActive = idx === activeId;
                  const revealed = style === "reveal" ? idx <= activeId : true;
                  return (
                    <span
                      key={`${w.start}-${i}`}
                      style={{
                        color:
                          isActive && style !== "clean" ? accent : "#ffffff",
                        opacity: revealed ? 1 : 0.25,
                        display: "inline-block",
                        transform:
                          isActive && style === "karaoke"
                            ? "scale(1.12)"
                            : "scale(1)",
                        transition: "transform 120ms, opacity 120ms",
                        marginRight: "0.3em",
                      }}
                    >
                      {w.text}
                    </span>
                  );
                })}
              </p>
            </div>
          )}

          {/* Play/pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center"
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

      {/* Caption style */}
      <section className="glass flex flex-col gap-3 rounded-2xl p-4">
        <p className="text-sm font-medium">Caption style</p>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm",
                style === s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
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