import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClipEditor } from "./editor";
import type { Clip } from "@/lib/types";

export default async function ClipEditorPage({
  params,
}: {
  params: Promise<{ id: string; clipId: string }>;
}) {
  const { id, clipId } = await params;
  const supabase = await createClient();

  const { data: clipData } = await supabase
    .from("clips")
    .select("*")
    .eq("id", clipId)
    .single();
  if (!clipData) notFound();
  const clip = clipData as Clip;

  const { data: video } = await supabase
    .from("videos")
    .select("storage_path")
    .eq("id", clip.video_id)
    .single();
  if (!video) notFound();

  const header = (
    <div>
      <Link
        href={`/projects/${id}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to clips
      </Link>
      <h1 className="font-display text-xl font-bold break-words">{clip.title}</h1>
    </div>
  );

  // YouTube imports keep no source video, so there's nothing to live-edit — the
  // worker already rendered the short. Show the finished clip with a download.
  if (!video.storage_path) {
    const { data: signed } = clip.output_key
      ? await supabase.storage
          .from("renders")
          .createSignedUrl(clip.output_key, 60 * 60)
      : { data: null };

    return (
      <div className="flex flex-col gap-5">
        {header}
        {signed?.signedUrl ? (
          <div className="mx-auto flex w-full max-w-[300px] flex-col gap-3">
            <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-black shadow-xl">
              <video
                src={signed.signedUrl}
                controls
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <a
              href={signed.signedUrl}
              download={`${clip.title}.mp4`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[linear-gradient(90deg,var(--brand-pink),var(--brand-cyan))] px-4 text-sm font-semibold text-[#1a0e2e]"
            >
              <Download className="size-4" />
              Download MP4
            </a>
          </div>
        ) : (
          <p className="glass rounded-2xl p-5 text-sm text-muted-foreground">
            {clip.status === "failed"
              ? "This clip failed to render."
              : "This clip is still being rendered — check back in a moment."}
          </p>
        )}
      </div>
    );
  }

  // Uploaded videos keep their source — load it for the live editor preview.
  const { data: signed } = await supabase.storage
    .from("videos")
    .createSignedUrl(video.storage_path, 60 * 60 * 2);

  return (
    <div className="flex flex-col gap-5">
      {header}
      {signed?.signedUrl ? (
        <ClipEditor clip={clip} videoUrl={signed.signedUrl} />
      ) : (
        <p className="glass rounded-2xl p-5 text-sm text-destructive">
          Could not load the source video for preview.
        </p>
      )}
    </div>
  );
}
