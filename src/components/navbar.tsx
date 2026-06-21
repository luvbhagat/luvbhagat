import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Top navigation bar. Shows the AuraClip AI logo and, when the user is signed
// in, a "Sign out" button. Sign out is a tiny form that POSTs to a server
// route which clears the session.
export function Navbar({ showSignOut = false }: { showSignOut?: boolean }) {
  return (
    <header className="sticky top-0 z-50 w-full">
      <nav className="glass mx-auto mt-4 flex max-w-5xl items-center justify-between rounded-2xl px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--brand-pink),var(--brand-cyan))] text-[#1a0e2e]">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold">
            AuraClip <span className="text-brand-gradient">AI</span>
          </span>
        </Link>

        {showSignOut && (
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        )}
      </nav>
    </header>
  );
}
