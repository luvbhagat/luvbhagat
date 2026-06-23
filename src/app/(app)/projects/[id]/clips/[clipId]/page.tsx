import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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

  // The source video file (for the live preview).
  const { data: video } = await supabase
    .from("videos")
    .select("storage_path")
    .eq("id", clip.video_id)
    .single();
  if (!video) notFound();

  const { data: signed } = await supabase.storage
    .from("videos")
    .createSignedUrl(video.storage_path, 60 * 60 * 2);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href={`/projects/${id}`}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to clips
        </Link>
        <h1 className="font-display text-xl font-bold break-words">
          {clip.title}
        </h1>
      </div>

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