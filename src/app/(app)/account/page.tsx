import Link from "next/link";
import { Youtube, Instagram, Music2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BuyCredits } from "@/components/app/buy-credits";
import { CREDIT_PACK } from "@/lib/credits";
import { providerConfigured } from "@/lib/social";
import {
  SOCIAL_PROVIDERS,
  SOCIAL_LABELS,
  type SocialProvider,
} from "@/lib/types";

const ICONS: Record<SocialProvider, typeof Youtube> = {
  youtube: Youtube,
  tiktok: Music2,
  instagram: Instagram,
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{
    purchase?: string;
    social?: string;
    provider?: string;
    reason?: string;
  }>;
}) {
  const { purchase, social, provider, reason } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("credit_balance, plan")
    .eq("id", user?.id ?? "")
    .single();

  const { data: conns } = await supabase
    .from("social_connections")
    .select("provider, username, token_expires_at")
    .eq("user_id", user?.id ?? "");
  const connected = new Map(
    (conns ?? []).map((c) => [c.provider as SocialProvider, c]),
  );

  const price = `$${(CREDIT_PACK.amountCents / 100).toFixed(0)}`;
  const providerLabel = provider
    ? (SOCIAL_LABELS[provider as SocialProvider] ?? provider)
    : "";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Account</h1>

      {purchase === "success" && (
        <p className="glass rounded-xl p-3 text-sm text-brand-cyan">
          Payment received — your credits have been added.
        </p>
      )}

      {/* Social connection status banner */}
      {social === "connected" && (
        <p className="glass rounded-xl p-3 text-sm text-brand-cyan">
          Connected {providerLabel}.
        </p>
      )}
      {social === "disconnected" && (
        <p className="glass rounded-xl p-3 text-sm text-muted-foreground">
          Disconnected {providerLabel}.
        </p>
      )}
      {social === "setup" && (
        <p className="glass rounded-xl p-3 text-sm text-brand-amber">
          {providerLabel} isn&apos;t set up yet. Add its API keys to connect —
          see <code>docs/SOCIAL.md</code>.
        </p>
      )}
      {social === "error" && (
        <p className="glass rounded-xl p-3 text-sm text-destructive">
          Couldn&apos;t connect {providerLabel}
          {reason ? `: ${reason}` : "."}
        </p>
      )}

      <section className="glass flex flex-col gap-4 rounded-2xl p-5">
        <div>
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="font-medium">{user?.email}</p>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Plan</p>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize">
            {profile?.plan ?? "free"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Credits</p>
          <span className="font-display text-xl font-bold text-brand-gradient">
            {profile?.credit_balance ?? 0}
          </span>
        </div>
      </section>

      {/* Connections */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Connections</h2>
        <p className="text-sm text-muted-foreground">
          Connect your accounts so you can post clips straight to your socials.
        </p>
        <div className="flex flex-col gap-2">
          {SOCIAL_PROVIDERS.map((p) => {
            const Icon = ICONS[p];
            const conn = connected.get(p);
            const ready = providerConfigured(p);
            return (
              <div
                key={p}
                className="glass flex items-center gap-3 rounded-2xl p-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{SOCIAL_LABELS[p]}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {conn
                      ? conn.username
                        ? `Connected as ${conn.username}`
                        : "Connected"
                      : ready
                        ? "Not connected"
                        : "Set up needed"}
                  </p>
                </div>
                {conn ? (
                  <form
                    action={`/api/social/${p}/disconnect`}
                    method="post"
                    className="flex items-center gap-2"
                  >
                    <span className="hidden items-center gap-1 text-xs text-brand-cyan sm:flex">
                      <Check className="size-3.5" />
                    </span>
                    <Button type="submit" variant="outline" size="sm">
                      Disconnect
                    </Button>
                  </form>
                ) : ready ? (
                  <Button asChild variant="brand" size="sm">
                    <a href={`/api/social/${p}/connect`}>Connect</a>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Set up
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Posting on your behalf needs each platform&apos;s developer app. Setup
          steps are in <code>docs/SOCIAL.md</code>.
        </p>
      </section>

      <section className="glass flex flex-col gap-3 rounded-2xl p-5">
        <p className="text-sm font-medium">Buy more credits</p>
        <p className="text-xs text-muted-foreground">
          {CREDIT_PACK.credits} credits renders ~
          {Math.floor(CREDIT_PACK.credits / 10)} clips.
        </p>
        <BuyCredits credits={CREDIT_PACK.credits} price={price} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Appearance</h2>
        <ThemeToggle />
      </section>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>

      <Link
        href="/setup"
        className="text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Run the setup check
      </Link>
    </div>
  );
}
