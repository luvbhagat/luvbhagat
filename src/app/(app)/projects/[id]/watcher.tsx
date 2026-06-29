"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { VideoStatus } from "@/lib/types";

// While a video is being processed, this quietly polls the server every few
// seconds and refreshes the page once the status changes. For uploads the
// /refresh endpoint advances the transcription; for YouTube imports the worker
// runs the whole pipeline (importing -> transcribing -> analyzing -> rendering
// -> ready) and /refresh just reports the current status.
const MESSAGES: Partial<Record<VideoStatus, string>> = {
  importing:
    "Downloading from YouTube… this can take a minute. The page updates automatically.",
  transcribing: "Transcribing the audio… this page updates automatically.",
  analyzing: "Finding the best moments… this page updates automatically.",
  rendering: "Rendering your shorts… this page updates automatically.",
};
export function TranscribeWatcher({
  id,
  status,
}: {
  id: string;
  status: VideoStatus;
}) {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function tick() {
      try {
        const res = await fetch(`/api/videos/${id}/refresh`, { method: "POST" });
        const json = (await res.json()) as { status?: string };
        // Any change from the status we rendered with means the page is stale —
        // refresh so we re-render with the new state (and remount this watcher).
        if (json.status && json.status !== status) {
          router.refresh();
          return;
        }
      } catch {
        // ignore transient errors and keep polling
      }
      if (active) timer = setTimeout(tick, 4000);
    }

    let timer = setTimeout(tick, 4000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, status, router]);

  const message = MESSAGES[status] ?? "Working… this page updates automatically.";

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {message}
    </p>
  );
}
