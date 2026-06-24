# Cliporo AI — Getting Started (Full First-Run Guide)

This single guide takes you from a fresh clone to a working app: sign in →
upload → transcribe → AI-detect clips → caption/trim → render a vertical MP4 →
download. Do the steps in order.

The per-phase docs (PHASE-1 … PHASE-5) have extra detail if you get stuck.

---

## 0. Prerequisites

- **Node.js 20+** (`node -v`) and **npm**.
- **FFmpeg** on your PATH (`ffmpeg -version`) — needed only for rendering.
  - Windows: `winget install Gyan.FFmpeg` (reopen the terminal afterwards)
  - Mac: `brew install ffmpeg`
- Free accounts:
  - **Supabase** (auth + database + storage) — https://supabase.com
  - **AssemblyAI** (transcription) — https://www.assemblyai.com
  - **Anthropic** (AI clip detection) — https://console.anthropic.com
  - **Stripe** (optional, for buying credits) — https://dashboard.stripe.com

---

## 1. Install dependencies

```
npm install
```

---

## 2. Create your secrets file

```
cp .env.example .env.local
```

Then fill in `.env.local`. Here's every variable and where it comes from:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` public key |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your Vercel URL in prod |
| `ASSEMBLYAI_API_KEY` | AssemblyAI dashboard → API key |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys (add billing credit) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` (secret) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (test mode) — optional |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → signing secret — optional |

> `.env.local` is gitignored — never commit it. The `service_role` and Stripe
> keys are server-only secrets; never expose them in the browser.

---

## 3. Set up the database (run all 5 migrations IN ORDER)

Supabase → **SQL Editor** → **New query** → paste each file's contents → **Run**.
Run them in this order (each is safe to re-run):

1. `supabase/migrations/0001_videos.sql` — videos table + private `videos` bucket
2. `supabase/migrations/0002_clips.sql` — clips table
3. `supabase/migrations/0003_edit_config.sql` — editor config column
4. `supabase/migrations/0004_renders.sql` — private `renders` bucket
5. `supabase/migrations/0005_credits.sql` — profiles, credit ledger, 100 starter credits

---

## 4. Turn on login

In Supabase → **Authentication**:

- **Providers → Email**: enable. (While testing, you can turn **Confirm email**
  OFF so new accounts work instantly.)
- **Providers → Google** (optional): enable and paste a Google OAuth Client ID
  + Secret. Add Supabase's shown callback URL to your Google OAuth client. Full
  steps in `docs/SETUP.md`.
- **URL Configuration → Redirect URLs**: add `http://localhost:3000/auth/callback`
  (and your Vercel URL's `/auth/callback` once deployed).

---

## 5. Run it and try the full flow

```
npm run dev
```

Open http://localhost:3000, then:

1. **Sign in** (create an account). You start with **100 credits**.
2. **Create** → upload a **short (1–2 min) video** to keep the first test fast.
3. It uploads, then transcribes — the project page updates automatically to
   **Ready**.
4. Click **Find clips with AI** → Claude returns scored clip candidates.
5. Click a clip → the **editor**: pick a caption style/position/color, trim,
   press **Play preview**, then **Save changes**.
6. Click **Render clip** → it charges 10 credits and goes to **queued**.
7. In a second terminal (project folder), run the render worker:
   ```
   npm run worker
   ```
   It downloads the source, burns in the captions with FFmpeg, uploads the MP4,
   and marks the clip **ready**.
8. Open **History** → **Download** your vertical clip. 🎉

---

## 6. Deploy to Vercel (go live)

1. Push to GitHub (already connected) and import the repo at https://vercel.com.
2. Add these **Environment Variables** in Vercel (Settings → Environment
   Variables): all the `NEXT_PUBLIC_*`, `ASSEMBLYAI_API_KEY`, `ANTHROPIC_API_KEY`,
   and (for billing) `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `SUPABASE_SERVICE_ROLE_KEY`. Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL.
3. Add `https://your-app.vercel.app/auth/callback` to Supabase Redirect URLs.
4. For Stripe: create a webhook to `https://your-app.vercel.app/api/billing/webhook`
   (event `checkout.session.completed`).

> The render **worker** is local-only for now (you run `npm run worker`).
> Hosting it as an always-on queue is a future step.

---

## 7. Troubleshooting

- **Dashboard always redirects to /login** → Supabase keys missing/wrong in
  `.env.local`. Restart `npm run dev` after editing env.
- **Upload fails** → did you run migration 0001 (creates the `videos` bucket)?
  Big files are limited by your Supabase plan's file-size limit.
- **Stuck on "Transcribing…"** → check `ASSEMBLYAI_API_KEY`; very long videos
  take longer.
- **"Find clips" errors** → check `ANTHROPIC_API_KEY` and that the Anthropic
  account has credit.
- **`npm run worker` says FFmpeg not found** → install FFmpeg and reopen the
  terminal.
- **Worker can't write results** → check `SUPABASE_SERVICE_ROLE_KEY` and that
  migration 0004 ran.
- **Buy credits says billing isn't set up** → add your Stripe keys.