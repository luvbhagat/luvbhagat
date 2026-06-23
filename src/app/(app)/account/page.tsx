import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BuyCredits } from "@/components/app/buy-credits";
import { CREDIT_PACK } from "@/lib/credits";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>;
}) {
  const { purchase } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("credit_balance, plan")
    .eq("id", user?.id ?? "")
    .single();

  const price = `$${(CREDIT_PACK.amountCents / 100).toFixed(0)}`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Account</h1>

      {purchase === "success" && (
        <p className="glass rounded-xl p-3 text-sm text-brand-cyan">
          Payment received — your credits have been added.
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
    </div>
  );
}