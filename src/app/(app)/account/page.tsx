import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/theme-toggle";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Account</h1>

      <section className="glass flex flex-col gap-4 rounded-2xl p-5">
        <div>
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="font-medium">{user?.email}</p>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Plan</p>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
            Free
          </span>
        </div>
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