import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/app/status-badge";
import type { Video } from "@/lib/types";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });
  const videos = (data ?? []) as Video[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Projects</h1>

      {videos.length === 0 ? (
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
      ) : (
        <ul className="flex flex-col gap-3">
          {videos.map((v) => (
            <li key={v.id}>
              <Link
                href={`/projects/${v.id}`}
                className="glass flex items-center gap-4 rounded-2xl p-4 transition-transform hover:scale-[1.01]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Clapperboard className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{v.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={v.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}