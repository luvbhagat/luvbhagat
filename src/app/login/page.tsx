import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

// Login page (the "/login" route). If the visitor is ALREADY logged in, we
// skip the form and send them straight to the dashboard.
export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--brand-pink),var(--brand-cyan))] text-[#1a0e2e]">
          <Sparkles className="size-5" />
        </span>
        <span className="font-display text-xl font-semibold">
          AuraClip <span className="text-brand-gradient">AI</span>
        </span>
      </Link>

      <div className="glass w-full max-w-sm rounded-2xl p-7 shadow-xl">
        <h1 className="font-display text-center text-2xl font-bold">
          Welcome back
        </h1>
        <p className="mt-1.5 mb-6 text-center text-sm text-muted-foreground">
          Sign in to start creating clips
        </p>

        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By continuing you agree to the AuraClip AI Terms &amp; Privacy Policy.
      </p>
    </div>
  );
}
