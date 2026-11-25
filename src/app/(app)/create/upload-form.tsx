"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileVideo, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

// Read the video's duration in the browser (best-effort, optional).
function readDuration(f: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        const d = Number.isFinite(v.duration) ? Math.round(v.duration) : null;
        URL.revokeObjectURL(v.src);
        resolve(d);
      };
      v.onerror = () => resolve(null);
      v.src = URL.createObjectURL(f);
    } catch {
      resolve(null);
    }
  });
}

export function UploadForm() {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pick(f: File | null) {
    if (f && !f.type.startsWith("video/")) {
      setError("Please choose a video file (mp4, mov, or webm).");
      return;
    }
    setError(null);
    setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session expired — please sign in again.");
      setBusy(false);
      return;
    }

    // Store under a folder named after the user id (matches our storage RLS).
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "mp4";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("videos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setError(`Upload failed: ${upErr.message}`);
      setBusy(false);
      return;
    }

    const duration = await readDuration(file);

    const { data: inserted, error: insErr } = await supabase
      .from("videos")
      .insert({
        user_id: user.id,
        title: file.name,
        storage_path: path,
        status: "uploaded",
        duration_sec: duration,
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      setError(insErr?.message ?? "Could not save the video record.");
      setBusy(false);
      return;
    }

    // Kick off transcription (fire-and-forget; the project page polls status).
    await fetch("/api/transcribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId: inserted.id }),
    }).catch(() => {});

    router.push(`/projects/${inserted.id}`);
    router.refresh();
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
          {!busy && (
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label="Remove file"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="glass rounded-xl p-3 text-sm text-destructive">{error}</p>
      )}

      <Button
        variant="brand"
        size="lg"
        disabled={!file || busy}
        onClick={handleUpload}
        className="w-full"
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Uploading…
          </>
        ) : (
          "Upload & transcribe"
        )}
      </Button>
    </div>
  );
}