import { Clock, Download, Film } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PostClip } from "@/components/app/post-clip";
import type { Clip } from "@/lib/types";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Run the three independent reads at once instead of one-after-another.
  const [clipsRes, ytRes, postsRes] = await Promise.all([
    supabase
      .from("clips")
      .select("*")
      .eq("status", "ready")
      .order("created_at", { ascending: false }),
    // Is YouTube connected? (controls whether the Post button is active)
    supabase
      .from("social_connections")
      .select("provider")
      .eq("user_id", user?.id ?? "")
      .eq("provider", "youtube")
      .maybeSingle(),
    // Clips already posted to YouTube -> their live URL.
    supabase
      .from("social_posts")
      .select("clip_id, remote_url")
      .eq("user_id", user?.id ?? "")
      .eq("provider", "youtube")
      .eq("status", "posted"),
  ]);

  const clips = (clipsRes.data ?? []) as Clip[];
  const youtubeConnected = Boolean(ytRes.data);
  const postedByClip = new Map(
    (postsRes.data ?? []).map((p) => [
      p.clip_id as string,
      p.remote_url as string,
    ]),
  );

  // Build short-lived download links for each finished MP4.
  const withUrls = await Promise.all(
    clips.map(async (clip) => {
      let url: string | null = null;
      if (clip.output_key) {
        const { data: signed } = await supabase.storage
          .from("renders")
          .createSignedUrl(clip.output_key, 60 * 60);
        url = signed?.signedUrl ?? null;
      }
      return { clip, url };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">History</h1>

      {withUrls.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Clock className="size-6" />
          </span>
          <p className="text-sm text-muted-foreground">
            Rendered clips ready to download will show up here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {withUrls.map(({ clip, url }) => (
            <li
              key={clip.id}
              className="glass flex items-center gap-4 rounded-2xl p-4"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <Film className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{clip.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(clip.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {url && (
                  <a
                    href={url}
                    download={`${clip.title}.mp4`}
                    className="inline-flex size-9 items-center justify-center rounded-md bg-[linear-gradient(90deg,var(--brand-pink),var(--brand-cyan))] text-[#1a0e2e]"
                    aria-label="Download MP4"
                  >
                    <Download className="size-4" />
                  </a>
                )}
                <PostClip
                  clipId={clip.id}
                  youtubeConnected={youtubeConnected}
                  postedUrl={postedByClip.get(clip.id) ?? null}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}