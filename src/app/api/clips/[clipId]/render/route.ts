import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Queues a clip for rendering. The actual MP4 render (FFmpeg, captions burned
// in) runs in a separate worker process — see worker/render.mjs and
// docs/PHASE-3B-RENDER.md — because video rendering can't run on Vercel.
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
    .select("id, status")
    .eq("id", clipId)
    .single();
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("clips")
    .update({ status: "queued" })
    .eq("id", clipId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message:
      "Queued for rendering. Run the render worker (npm run worker) to produce " +
      "the MP4 — it will then appear under History.",
  });
}