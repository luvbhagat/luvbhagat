"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Youtube, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// Accepts the common YouTube link shapes: watch?v=, youtu.be/, shorts/, embed/,
// live/, with or without www/m and extra query params.
const YT_RE =
  /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|live\/)[\w-]{11}|youtu\.be\/[\w-]{11})/i;

export function YouTubeForm() {
  const router = useRouter();
  const supabase = createClient();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleImport() {
    const trimmed = url.trim();
    if (!YT_RE.test(trimmed)) {
      setError("That doesn't look like a YouTube link. Paste a full video URL.");
      return;
    }
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

    // Create the project now; the worker downloads the video and transcribes it.
    // We don't know the real title yet, so use the link until the worker fills
    // in the actual YouTube title.
    const { data: inserted, error: insErr } = await supabase
      .from("videos")
      .insert({
        user_id: user.id,
        title: trimmed,
        source_url: trimmed,
        status: "importing",
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      setError(insErr?.message ?? "Could not start the import.");
      setBusy(false);
      return;
    }

    router.push(`/projects/${inserted.id}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="glass flex items-center gap-3 rounded-2xl p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          <Youtube className="size-5" />
        </span>
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) handleImport();
          }}
          placeholder="Paste a YouTube link…"
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {error && (
        <p className="glass rounded-xl p-3 text-sm text-destructive">{error}</p>
      )}

      <Button
        variant="brand"
        size="lg"
        disabled={!url.trim() || busy}
        onClick={handleImport}
        className="w-full"
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Starting import…
          </>
        ) : (
          "Import from YouTube"
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        Importing runs on your local worker (<code>npm run worker</code>): it
        downloads the video, finds the best moments, and renders the shorts. We
        only keep the finished clips — never the source video. Billed by length
        (1 credit per minute).
      </p>
    </div>
  );
}
