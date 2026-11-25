"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Triggers AI clip detection for a transcribed video, then refreshes the page
// to show the candidates.
export function DetectClips({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${id}/detect`, { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Clip detection failed.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button variant="brand" size="lg" onClick={run} disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Finding the best moments…
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            Find clips with AI
          </>
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}