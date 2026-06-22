import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/app/status-badge";
import { TranscribeWatcher } from "./watcher";
import type { Video } from "@/lib/types";

function formatDuration(sec: number | null) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) notFound();
  const video = data as Video;
  const duration = formatDuration(video.duration_sec);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/projects"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Projects
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-bold break-all">
            {video.title}
          </h1>
          <StatusBadge status={video.status} />
        </div>
        {duration && (
          <p className="mt-1 text-sm text-muted-foreground">Length {duration}</p>
        )}
      </div>

      {video.status === "transcribing" && (
        <div className="glass rounded-2xl p-5">
          <TranscribeWatcher id={video.id} />
        </div>
      )}

      {video.status === "uploaded" && (
        <div className="glass rounded-2xl p-5 text-sm text-muted-foreground">
          Uploaded. Transcription is starting…
          <TranscribeWatcher id={video.id} />
        </div>
      )}

      {video.status === "failed" && (
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-destructive">
            Transcription failed{video.error ? `: ${video.error}` : "."}
          </p>
        </div>
      )}

      {video.status === "ready" && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Transcript</h2>
            <span className="text-xs text-muted-foreground">
              {video.transcript?.words.length ?? 0} words
            </span>
          </div>
          <div className="glass max-h-[50vh] overflow-y-auto rounded-2xl p-5 text-sm leading-relaxed">
            {video.transcript?.text || "No speech detected."}
          </div>
          <p className="text-xs text-muted-foreground">
            Next up (PRD Phase 2): AI clip detection will turn this transcript
            into short clip candidates.
          </p>
        </section>
      )}
    </div>
  );
}