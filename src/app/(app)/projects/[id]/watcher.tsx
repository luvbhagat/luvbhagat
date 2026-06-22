"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// While a video is transcribing, this quietly polls the server every few
// seconds and refreshes the page once the status changes.
export function TranscribeWatcher({ id }: { id: string }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function tick() {
      try {
        const res = await fetch(`/api/videos/${id}/refresh`, { method: "POST" });
        const json = (await res.json()) as { status?: string };
        if (json.status && json.status !== "transcribing") {
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
  }, [id, router]);

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Transcribing… this page updates automatically.
    </p>
  );
}