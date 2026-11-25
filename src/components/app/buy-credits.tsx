"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BuyCredits({
  credits,
  price,
}: {
  credits: number;
  price: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setError(
        json.error?.includes("STRIPE")
          ? "Billing isn't set up yet (no Stripe key)."
          : (json.error ?? "Could not start checkout."),
      );
    } catch {
      setError("Could not start checkout.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="brand" onClick={buy} disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Starting checkout…
          </>
        ) : (
          <>
            <CreditCard className="size-4" /> Buy {credits} credits — {price}
          </>
        )}
      </Button>
      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}