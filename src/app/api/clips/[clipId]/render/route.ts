import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Renders a clip's edit_config to a downloadable vertical MP4.
//
// Video rendering (Remotion + headless Chromium / FFmpeg) cannot run on
// Vercel's serverless functions — it needs a dedicated render host such as
// Remotion Lambda (AWS). That host is not configured yet, so for now we
// validate the request and return a clear, actionable message.
//
// When the render host is ready, this route will: load the clip + its
// edit_config, enqueue a render job, and (on completion) store the MP4 in
// Supabase Storage and set the clip status to "ready" with an output_key.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ clipId: string }> },
) {
  const { clipId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: clip } = await supabase
    .from("clips")
    .select("id, edit_config")
    .eq("id", clipId)
    .single();
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: false,
    message:
      "Your edits are saved. Rendering to MP4 needs a video render host " +
      "(Remotion Lambda on AWS) which isn't connected yet — that's the next " +
      "setup step. See docs/PHASE-3-EDITOR.md.",
  });
}