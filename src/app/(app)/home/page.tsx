import Link from "next/link";
import { ArrowRight, Plus, Film, Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = user?.email?.split("@")[0] ?? "creator";

  const { data: profile } = await supabase
    .from("profiles")
    .select("credit_balance")
    .eq("id", user?.id ?? "")
    .single();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="font-display text-2xl font-bold capitalize">{name}</h1>
        </div>
        <Link
          href="/account"
          className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
        >
          <Coins className="size-3.5 text-brand-amber" />
          {profile?.credit_balance ?? 0} credits
        </Link>
      </header>

      <Link
        href="/create"
        className="glass group flex items-center justify-between rounded-2xl p-5 transition-transform hover:scale-[1.01]"
      >
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand-pink),var(--brand-cyan))] text-[#1a0e2e]">
            <Plus className="size-6" />
          </span>
          <div>
            <p className="font-display font-semibold">Create new clips</p>
            <p className="text-sm text-muted-foreground">
              Upload a long video to get started
            </p>
          </div>
        </div>
        <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Recent projects</h2>
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Film className="size-6" />
          </span>
          <p className="text-sm text-muted-foreground">
            No projects yet. Upload your first video to see clips here.
          </p>
          <Button asChild variant="brand" size="sm">
            <Link href="/create">Upload a video</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}