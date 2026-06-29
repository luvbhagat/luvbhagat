// Credit pricing (illustrative — tune with a real cost model before launch).

// Credits charged when a user renders one clip to MP4 (manual upload flow).
export const RENDER_COST = 10;

// YouTube imports are billed by the source video's length (Opus Clip style):
// one credit per minute of video, charged up front by the worker. This covers
// downloading, transcribing, analyzing, and rendering every short in one pass.
export const IMPORT_COST_PER_MIN = 1;

// Credits an import of `durationSec` will cost (rounded up, minimum 1).
export function importCost(durationSec: number): number {
  return Math.max(1, Math.ceil(durationSec / 60) * IMPORT_COST_PER_MIN);
}

// One-off credit pack sold via Stripe Checkout.
export const CREDIT_PACK = {
  credits: 200,
  amountCents: 900, // $9.00
  name: "Cliporo AI — 200 credits",
};