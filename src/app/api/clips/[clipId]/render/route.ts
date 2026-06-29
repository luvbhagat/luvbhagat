import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RENDER_COST } from "@/lib/credits";

// Debits credits, then queues the clip for the local FFmpeg worker. If the
// render fails, the worker refunds the credits (see worker/render.mjs).
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

  // Atomic debit. Raises 'insufficient_credits' if the balance is too low.
  const { error: spendErr } = await supabase.rpc("spend_credits", {
    p_amount: RENDER_COST,
    p_reason: "render",
    p_ref: clipId,
  });
  if (spendErr) {
    if (spendErr.message.includes("insufficient_credits")) {
      return NextResponse.json(
        {
          error: "not_enough_credits",
          message: `You need ${RENDER_COST} credits to render. Buy more from the Account tab.`,
        },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: spendErr.message }, { status: 500 });
  }

  const { error: upErr } = await supabase
    .from("clips")
    .update({ status: "queued" })
    .eq("id", clipId);
  if (upErr) {
    // Refund if we charged but could not queue.
    await supabase.rpc("spend_credits", {
      p_amount: -RENDER_COST,
      p_reason: "refund",
      p_ref: clipId,
    });
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: `Charged ${RENDER_COST} credits and queued. Run the render worker (npm run worker); the clip appears under History.`,
  });
}