import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/app/status-badge";
import { TranscribeWatcher } from "./watcher";
import { DetectClips } from "@/components/app/detect-clips";
import type { Video, Clip } from "@/lib/types";

function formatDuration(sec: number | null) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500/20 text-emerald-400";
  if (score >= 60) return "bg-brand-amber/20 text-brand-amber";
  return "bg-secondary text-muted-foreground";
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

  const { data: clipData } = await supabase
    .from("clips")
    .select("*")
    .eq("video_id", id)
    .order("score", { ascending: false });
  const clips = (clipData ?? []) as Clip[];

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

      {(video.status === "transcribing" || video.status === "uploaded") && (
        <div className="glass rounded-2xl p-5">
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
        <>
          {clips.length === 0 ? (
            <div className="glass flex flex-col items-center gap-4 rounded-2xl p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Transcription is done. Now let Cliporo AI find the most
                clip-worthy moments.
              </p>
              <DetectClips id={video.id} />
            </div>
          ) : (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold">
                {clips.length} clip{clips.length === 1 ? "" : "s"} found
              </h2>
              <ul className="flex flex-col gap-3">
                {clips.map((clip) => {
                  const len = formatDuration(
                    Number(clip.end_sec) - Number(clip.start_sec),
                  );
                  return (
                    <li key={clip.id}>
                      <Link
                        href={`/projects/${video.id}/clips/${clip.id}`}
                        className="glass flex flex-col gap-2 rounded-2xl p-4 transition-transform hover:scale-[1.01]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium">{clip.title}</p>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${scoreColor(
                              clip.score,
                            )}`}
                          >
                            {clip.score}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {clip.transcript_slice?.text}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {len} · starts at{" "}
                          {formatDuration(Number(clip.start_sec)) ?? "0:00"}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                Tap a clip to caption, trim, and preview it in the editor.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}