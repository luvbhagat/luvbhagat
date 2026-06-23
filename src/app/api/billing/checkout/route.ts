import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { CREDIT_PACK } from "@/lib/credits";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not set on the server" },
      { status: 500 },
    );
  }

  const stripe = new Stripe(key);
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: CREDIT_PACK.amountCents,
          product_data: { name: CREDIT_PACK.name },
        },
      },
    ],
    client_reference_id: user.id,
    metadata: { user_id: user.id, credits: String(CREDIT_PACK.credits) },
    success_url: `${origin}/account?purchase=success`,
    cancel_url: `${origin}/account?purchase=cancel`,
  });

  return NextResponse.json({ url: session.url });
}