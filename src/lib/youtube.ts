// YouTube upload helper (server-only — used by /api/clips/[clipId]/post).
//
// Uses the YouTube Data API v3 videos.insert with a multipart/related upload:
// one JSON part (title/description/privacy) + one video part (the MP4 bytes).
// Good for short clips; switch to resumable upload later for large files.

type UploadOpts = {
  accessToken: string;
  title: string;
  description: string;
  privacyStatus: "public" | "unlisted" | "private";
  bytes: Buffer;
};

export async function uploadShortToYouTube(
  opts: UploadOpts,
): Promise<{ videoId: string; url: string }> {
  const metadata = {
    snippet: {
      // YouTube caps titles at 100 chars.
      title: opts.title.slice(0, 100),
      description: opts.description.slice(0, 4900),
      categoryId: "22", // People & Blogs
    },
    status: {
      privacyStatus: opts.privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };

  const boundary = "cliporo_" + Math.random().toString(36).slice(2);
  const head = Buffer.from(
    `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      "Content-Type: video/mp4\r\n\r\n",
    "utf8",
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([head, opts.bytes, tail]);

  const res = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  const json = (await res.json()) as {
    id?: string;
    error?: { message?: string; errors?: { reason?: string }[] };
  };
  if (!res.ok || !json.id) {
    const reason = json.error?.errors?.[0]?.reason;
    throw new Error(
      json.error?.message
        ? `${json.error.message}${reason ? ` (${reason})` : ""}`
        : `YouTube upload failed (${res.status})`,
    );
  }

  // Vertical clips under 3 min are served as Shorts; the /shorts/ URL works
  // for any video id, so use it for the convenient mobile player.
  return { videoId: json.id, url: `https://youtube.com/shorts/${json.id}` };
}
