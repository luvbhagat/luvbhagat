"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileVideo, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function pick(f: File | null) {
    if (f && !f.type.startsWith("video/")) {
      setNotice("Please choose a video file (mp4, mov, or webm).");
      return;
    }
    setNotice(null);
    setFile(f);
  }

  function handleContinue() {
    // The processing pipeline (storage upload, transcription, clip detection,
    // rendering) is the next build phase and needs the service keys described
    // in docs/PRD.md (Phase 1). For now we confirm the file is ready.
    setNotice(
      "Nice — your video is selected. Connecting storage + AI processing is the next step (see docs/PRD.md, Phase 1).",
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            "glass flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-colors",
            dragging ? "border-primary" : "border-input",
          )}
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-pink),var(--brand-cyan))] text-[#1a0e2e]">
            <UploadCloud className="size-7" />
          </span>
          <p className="font-display font-semibold">Drag &amp; drop a video</p>
          <p className="text-sm text-muted-foreground">
            or click to browse — mp4, mov, webm
          </p>
        </button>
      ) : (
        <div className="glass flex items-center gap-4 rounded-2xl p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <FileVideo className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            aria-label="Remove file"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
      )}

      {notice && (
        <p className="glass rounded-xl p-3 text-sm text-brand-cyan">{notice}</p>
      )}

      <Button
        variant="brand"
        size="lg"
        disabled={!file}
        onClick={handleContinue}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );
}