import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Projects</h1>

      <div className="glass flex flex-col items-center gap-3 rounded-2xl p-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Clapperboard className="size-6" />
        </span>
        <p className="text-sm text-muted-foreground">
          Your uploaded videos and their detected clips will appear here.
        </p>
        <Button asChild variant="brand" size="sm">
          <Link href="/create">Upload a video</Link>
        </Button>
      </div>
    </div>
  );
}