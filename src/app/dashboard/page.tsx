import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";

// Dashboard (the "/dashboard" route). This is a PROTECTED page.
// Two layers of protection:
//   1. src/middleware.ts redirects logged-out users before this even loads.
//   2. The check below is a belt-and-suspenders fallback on the server.
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col px-4">
      <Navbar showSignOut />

      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="glass w-full max-w-md rounded-2xl p-8">
          <p className="text-sm text-muted-foreground">You&apos;re signed in</p>
          <h1 className="font-display mt-2 text-2xl font-bold">
            Welcome,{" "}
            <span className="text-brand-gradient">{user.email}</span>
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            This is your dashboard. Video features are coming next.
          </p>
        </div>
      </main>
    </div>
  );
}
