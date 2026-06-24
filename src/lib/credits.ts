// Credit pricing (illustrative — tune with a real cost model before launch).

// Credits charged when a user renders one clip to MP4.
export const RENDER_COST = 10;

// One-off credit pack sold via Stripe Checkout.
export const CREDIT_PACK = {
  credits: 200,
  amountCents: 900, // $9.00
  name: "Cliporo AI — 200 credits",
};