"use client";

import { useState } from "react";
import Link from "next/link";
import { Youtube, Loader2, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Privacy = "public" | "unlisted" | "private";

// "Post to YouTube" control shown on each finished clip in History.
export function PostClip({
  clipId,
  youtubeConnected,
  postedUrl,
}: {
  clipId: string;
  youtubeConnected: boolean;
  postedUrl?: string | null;
}) {
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(postedUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  // Already posted (or just posted) → show the link.
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-secondary px-3 text-sm font-medium text-brand-cyan"
      >
        <Check className="size-4" /> On YouTube
        <ExternalLink className="size-3.5" />
      </a>
    );
  }

  if (!youtubeConnected) {
    return (
      <Link
        href="/account"
        className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs text-muted-foreground hover:text-foreground"
      >
        <Youtube className="size-4" /> Connect to post
      </Link>
    );
  }

  async function handlePost() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clips/${clipId}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "youtube", privacy }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) setUrl(json.url);
      else setError(json.error ?? "Could not post.");
    } catch {
      setError("Network error — try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value as Privacy)}
          disabled={busy}
          aria-label="YouTube privacy"
          className="h-9 rounded-md border bg-transparent px-2 text-xs text-foreground outline-none"
        >
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="private">Private</option>
        </select>
        <Button size="sm" variant="brand" onClick={handlePost} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Posting…
            </>
          ) : (
            <>
              <Youtube className="size-4" /> Post
            </>
          )}
        </Button>
      </div>
      {error && <p className="max-w-[220px] text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
