# AuraClip AI — Phase 5 Setup (Credits & Billing)

Adds a credit system: every user starts with **100 free credits**, rendering a
clip costs **10 credits**, and users can **buy more** via Stripe.

## 1. Run the database migration
Supabase -> SQL Editor -> paste ALL of `supabase/migrations/0005_credits.sql`
-> Run. This creates `profiles` + `credit_ledger`, a signup trigger that grants
100 starter credits, backfills existing users, and adds the `spend_credits` /
`grant_credits` functions.

## 2. Stripe setup (for buying credits)
1. Create a free account at https://dashboard.stripe.com (stay in **Test
   mode** while developing).
2. **Developers -> API keys**: copy the **Secret key** (`sk_test_...`).
3. Add to `.env.local` (and Vercel env vars):
   ```
   STRIPE_SECRET_KEY=sk_test_...
   ```
4. **Developers -> Webhooks -> Add endpoint**:
   - URL: `https://your-app.vercel.app/api/billing/webhook`
   - Event: `checkout.session.completed`
   - Copy the **Signing secret** (`whsec_...`) into:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_...
     ```
5. The webhook grants credits using the service-role key, so also set
   **SUPABASE_SERVICE_ROLE_KEY** in your **Vercel** environment variables
   (you already have it locally for the render worker).

### Testing the webhook locally (optional)
Install the Stripe CLI, then:
```
stripe listen --forward-to localhost:3000/api/billing/webhook
```
It prints a `whsec_...` to use as `STRIPE_WEBHOOK_SECRET` while testing.

## How it works
- **Starter credits:** the signup trigger grants 100 credits and creates a
  `profiles` row. The balance shows on Home and Account.
- **Spend on render:** `POST /api/clips/[clipId]/render` calls `spend_credits`
  (atomic). Not enough credits -> HTTP 402 with a message. The render worker
  refunds the credits if the render fails.
- **Buy credits:** Account -> Buy credits opens **Stripe Checkout**. On success
  Stripe calls the webhook, which calls `grant_credits` to add them.
- **Ledger:** every change is recorded in `credit_ledger`
  (signup_grant / render / refund / purchase) — the audit source of truth.

## Tune pricing
Edit `src/lib/credits.ts`: `RENDER_COST` (credits per render) and `CREDIT_PACK`
(how many credits, and the price in cents). Keep `RENDER_COST` in sync with the
constant near the top of `worker/render.mjs`.