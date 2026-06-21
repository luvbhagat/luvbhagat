import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

// Landing page (the "/" route). Intentionally simple for now: a headline and
// a "Sign in" button, as requested.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col px-4">
      <Navbar />

      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="glass mb-6 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground">
          AI-powered short-form video, on autopilot
        </span>

        <h1 className="font-display max-w-2xl text-4xl font-bold leading-tight sm:text-6xl">
          Turn long videos into{" "}
          <span className="text-brand-gradient">scroll-stopping</span> shorts
        </h1>

        <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          AuraClip AI finds the best moments in your videos and turns them into
          short, vertical, captioned clips ready for social media.
        </p>

        <div className="mt-9">
          <Button asChild variant="brand" size="lg">
            <Link href="/login">
              Sign in
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} AuraClip AI
      </footer>
    </div>
  );
}
