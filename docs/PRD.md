# Cliporo AI — Product Requirements Document (Master)

**Version:** 3.0 (consolidated master)
**Status:** Draft for build
**Owner:** Luv Bhagat (solo founder)
**Last updated:** 2026-06-22

> This is the master PRD. It supersedes and consolidates the earlier base PRD
> (v2.0) and incorporates the two addenda in this folder:
> - [`PRD-navigation-theming.md`](./PRD-navigation-theming.md) (v2.1)
> - [`PRD-editor.md`](./PRD-editor.md) (v2.2)
>
> Where this document and an addendum disagree, **this document wins**.

---

## 1. Overview

### 1.1 One-liner
Cliporo AI turns long videos into short, vertical, auto-captioned clips ready
to post on TikTok, Instagram Reels, and YouTube Shorts.

### 1.2 The problem
Creators, podcasters, marketers, and agencies record long-form content
(podcasts, webinars, streams, talking-head videos) but the highest-growth
distribution channels reward **short vertical clips**. Manually finding the best
30–60 second moments, cropping to 9:16, adding animated captions, and exporting
is slow, repetitive, and requires editing skill. Most people never do it, so
their best content never reaches a short-form audience.

### 1.3 The solution
Upload a long video. Cliporo AI:
1. Transcribes it.
2. Uses AI to detect the most engaging, self-contained moments ("clips").
3. Auto-crops each to vertical 9:16 and adds animated word-level captions.
4. Lets the user fine-tune in a live editor.
5. Renders downloadable, post-ready MP4s.

### 1.4 Why now / why us
- Short-form is the dominant discovery channel and isn't reversing.
- Foundation models (Whisper-class transcription, LLM moment detection) make
  the hard parts cheap and good enough.
- Incumbents (Opus Clip, etc.) validate demand but leave room on price,
  caption quality/control, and a cleaner mobile-first experience.
- A solo founder can ship a focused, opinionated MVP because the core loop is
  narrow and well understood.

### 1.5 Competitive landscape
Direct: Opus Clip, Vizard, Klap, SendShort, 2Short. Adjacent: Descript,
CapCut, Submagic (captions only). **Cliporo's wedge:** live WYSIWYG caption
editor (preview == export), strong caption-style control, transparent
credit-based pricing, and a polished mobile-first UI on both web and native.

---

## 2. Goals & non-goals

### 2.1 Product goals (what success looks like)
- A user can go from "upload a 30-min video" to "download 5+ post-ready clips"
  with **zero editing skill** in under ~15 minutes of wall-clock time.
- Caption quality and animation are good enough to post **without external
  editing**.
- Pricing is understandable (credits) and the free tier is enough to feel the
  value once.

### 2.2 Business goals (MVP horizon)
- Validate willingness to pay: convert free → paid at a measurable rate.
- Keep unit economics positive: a paid render must cost less in compute than
  the credits it consumes.
- Reach first paying customers with a solo-buildable, low-ops architecture.

### 2.3 Success metrics (initial targets, revisit after launch)
| Metric | Definition | Target (first 90 days) |
|---|---|---|
| Activation | % of signups who render ≥1 clip | ≥ 40% |
| Time-to-first-clip | signup → first rendered clip | < 15 min median |
| Clip acceptance | % of detected clips the user renders | ≥ 30% |
| Free→paid conversion | activated free users who buy | ≥ 5% |
| Render success rate | renders completing without error | ≥ 98% |
| Gross margin per paid render | (credit revenue − compute cost) | > 0 |

### 2.4 Non-goals (explicitly NOT building)
- ❌ Multi-track timeline / full NLE editing (we are not CapCut/Premiere).
- ❌ Team collaboration, multi-seat workspaces (MVP is single-user).
- ❌ Direct publishing/scheduling to social platforms (MVP = download only;
  posting is a fast-follow).
- ❌ Stock media library, music/soundtracks, voiceover/TTS.
- ❌ Background removal / green screen.
- ❌ Any wardrobe / fashion / "AI Trial Room" feature — that is a *different
  product* and must never leak into this codebase or roadmap.
- ❌ On-prem / self-hosted offering.

---

## 3. Target users & personas

| Persona | Who | Core need | Willingness to pay |
|---|---|---|---|
| **The Podcaster** | Records 1–2 hr episodes weekly | Turn each episode into 5–10 promo clips | High |
| **The Creator/Streamer** | YouTube/Twitch long-form | Repurpose VODs into Shorts/Reels | Medium–High |
| **The Solopreneur/Coach** | Webinars, talking-head marketing | Clips for lead-gen, no editor on staff | High |
| **The Social Media Manager / small agency** | Manages a few clients | Volume clip production, fast turnaround | High (volume) |

**Primary persona for MVP: The Podcaster** — highest, most repeatable demand,
clearest before/after value, predictable content format (talking heads → easy
crop).

---

## 4. Scope: MVP vs. later

### 4.1 MVP (v1 — must ship)
1. Auth: email/password + Google (✅ already built — the foundation).
2. Upload a video file (and/or paste a YouTube/public URL — see §6.2).
3. Transcription (word-level timestamps).
4. AI clip detection → list of clip candidates with scores.
5. Auto 9:16 crop (center / face-aware best-effort) + animated captions.
6. Live clip editor: trim, edit caption text, pick caption style/position,
   pick transitions, live preview (Remotion `<Player>`).
7. Render → downloadable 1080×1920 MP4.
8. Credits: free starter credits, debit on render, buy more (Stripe).
9. Dashboard/home, projects list, render history, account/billing.
10. Light/dark glassmorphism theming + bottom-tab navigation.

### 4.2 Fast-follow (v1.x)
- Direct publish/schedule to TikTok/IG/YouTube.
- More caption presets & transitions.
- Aspect ratios 1:1 and 4:5.
- Auto-emoji and B-roll/keyword image overlays.
- Bulk render ("render all clips above score X").
- Native mobile app (Expo) reaching feature parity for review/render.

### 4.3 Later / vision
- Team workspaces & roles.
- Brand kits (fonts, colors, logo watermark presets).
- Auto-reframe with active-speaker tracking (multi-person podcasts).
- AI titles/hashtags/descriptions per clip.
- Analytics on posted clip performance (if publishing exists).

---

## 5. End-to-end user journey

```
Sign up / log in
      │
      ▼
Home (credits, recent projects, big "Create" button)
      │  tap Create
      ▼
Upload source video  ──►  (server) extract audio ─► transcribe ─► detect clips
      │                                                              │
      │  progress shown (queued → processing → ready)               │
      ▼                                                              ▼
Clip Picker: list of candidate clips (thumbnail, duration, score, hook text)
      │  tap a clip
      ▼
Editor: live preview + trim + captions + style + transitions
      │  tap Render  (credits debited here)
      ▼
Render job (queue → Remotion render → upload to storage)
      │
      ▼
History: rendered clip ready → Download (or later: Publish)
```

The "aha" moment is the **Clip Picker filling with good candidates** and the
**live caption preview** — design must get the user there fast.

---

## 6. Detailed feature specifications

### 6.1 Authentication & accounts (✅ built)
- Email/password and Google OAuth via Supabase Auth.
- Protected routes; logged-out users redirected to `/login`.
- On first signup, create a user profile row + grant starter credits (see §9).
- Account screen: email, current plan, credit balance, theme preference,
  sign out, delete account (later).

### 6.2 Video ingestion
**Inputs (MVP):**
- Direct file upload (mp4, mov, webm). Max length/size gated by plan (e.g.
  free: ≤ 30 min / ≤ 1 GB; paid tiers higher).
- *Optional MVP / fast-follow:* paste a public video URL (e.g. YouTube). Note
  legal/ToS risk; gate behind "you confirm you have rights" and treat as
  fast-follow if it complicates MVP.

**Upload mechanics:**
- Direct-to-storage upload (presigned URL to Cloudflare R2) to avoid proxying
  large files through the app server.
- Show resumable/chunked progress for large files where feasible.
- On upload complete, create a `videos` row (status `uploaded`) and enqueue the
  processing job.

**Validation & errors:** reject unsupported codecs early; surface clear errors
("This file is longer than your plan allows — upgrade or trim it first").

### 6.3 Transcription
- Extract audio with FFmpeg → send to a Whisper-class ASR service.
- Output: full transcript with **word-level timestamps** (required for animated
  captions and accurate trimming).
- Store transcript JSON (associated with the video).
- Language: auto-detect; MVP optimized for English, others best-effort.
- Cost control: transcription is per-minute priced — count it toward the
  processing-credit cost (see §9).

### 6.4 AI clip detection
- Input: transcript (+ optionally audio/video features later).
- An LLM analyzes the transcript to find self-contained, engaging moments:
  strong hook, complete thought, ~15–90s, emotional/insightful/funny/quotable.
- Output per candidate: `startSec`, `endSec`, a **virality/engagement score
  (0–100)**, a short **title/hook**, and the **transcript slice**.
- Return N candidates (e.g. up to 10–20), sorted by score.
- The user is **not** charged credits to detect clips — only to **render**
  (preview/detection is part of processing; see §9 for exact policy).
- Quality guardrails: avoid mid-sentence cuts (snap to word boundaries),
  enforce min/max duration, de-duplicate overlapping candidates.

### 6.5 Auto-crop to 9:16
- Default: center-crop to 9:16, scaled to 1080×1920.
- Best-effort face/subject centering for talking-head content (MVP: simple
  heuristic or static center; active-speaker tracking is later).
- User can nudge the crop framing in the editor (later: per-scene reframe).

### 6.6 Clip editor (see [`PRD-editor.md`](./PRD-editor.md) for full detail)
Summary of MVP capabilities:
- **Trim** start/end on a scrubber (snaps to words).
- **Edit caption text** (fix ASR errors); word timings preserved.
- **Caption style presets** (Karaoke Pop, Word Reveal, Bounce, Typewriter,
  Clean Lines) with editable font, colors (default to brand accents), size,
  position (bottom-third default / center / top), max words per line.
- **Transitions** (Cut, Fade, Slide, Zoom punch, Whip/blur) at clip in/out.
- **Effects toggles** (zoom-on-emphasis, auto-emoji [later], watermark).
- **Live preview** via Remotion `<Player>` — *preview is free and local*.
- **Render** button debits credits and produces the final MP4.

**Key architectural rule:** the same `editConfig` object drives both the live
`<Player>` and the server render, so **what you preview is what you export**.

### 6.7 Rendering
- Engine: **Remotion** (React-based) for captions/animation/transitions;
  **FFmpeg** for media prep and encoding (Remotion orchestrates FFmpeg).
- MVP hosting: **Remotion Lambda** (managed serverless render) to minimize ops.
  Self-hosted GPU/CPU render workers are a cost optimization for later.
- Output: 1080×1920 H.264 MP4, sane bitrate for social, with optional
  watermark on free tier.
- Flow: debit credits → enqueue job (BullMQ) → render → upload to R2 →
  mark `ready` → appears in History with a download URL.
- Idempotency: a render job has a unique key; retries must not double-charge.

### 6.8 Download & (later) publish
- MVP: signed download URL, expires after a window; re-downloadable from
  History while the file is retained (retention by plan, e.g. 30 days).
- Fast-follow: connect social accounts and publish/schedule directly.

### 6.9 Navigation & theming (see [`PRD-navigation-theming.md`](./PRD-navigation-theming.md))
- **Bottom tab bar**: Home, Projects, Create (center, raised, gradient), History,
  Account. Glassmorphic, floats over content. On wide desktop, may become a
  left rail.
- **Light/dark theme** with glassmorphism preserved in both; defaults to system
  preference, user-overridable in Account → Appearance, persisted.
- Brand accents (pink `#ff5fa8`, cyan `#5fd0ff`, amber `#ffb347`) constant across
  themes; only surfaces/text/background invert.

---

## 7. Screen inventory

| Screen | Route | Purpose | Tab bar |
|---|---|---|---|
| Landing | `/` | Marketing, sign-in CTA | hidden |
| Login | `/login` | Email + Google auth | hidden |
| Home / Dashboard | `/home` | Credits, recent projects, Create CTA | yes |
| Projects | `/projects` | All source videos + their clips | yes |
| Create / Upload | `/create` | New upload / URL ingest | yes (active) |
| Processing | `/projects/[id]` | Status while transcribing/detecting | yes |
| Clip Picker | `/projects/[id]/clips` | Candidate clips list | yes |
| Editor | `/projects/[id]/clips/[clipId]` | Live edit + render | optional/immersive |
| History | `/history` | Rendered clips, downloads | yes |
| Account / Billing | `/account` | Plan, credits, theme, sign out | yes |

(Authenticated routes live under an app shell that renders the tab bar; the
current foundation uses `/dashboard` as a placeholder for `/home`.)

---

## 8. Data model (Postgres via Supabase, Drizzle ORM)

> Tables are owned by the user (`user_id`) and protected by Supabase Row Level
> Security (RLS): a user can only read/write their own rows.

### 8.1 `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | = `auth.users.id` |
| `email` | text | |
| `display_name` | text | nullable |
| `theme_pref` | text | `system` \| `light` \| `dark` |
| `credit_balance` | int | denormalized cache of ledger sum |
| `plan` | text | `free` \| `creator` \| `pro` |
| `created_at` | timestamptz | |

### 8.2 `videos` (source uploads)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | |
| `title` | text | original filename or user title |
| `source_type` | text | `upload` \| `url` |
| `storage_key` | text | R2 object key |
| `duration_sec` | int | |
| `status` | text | `uploaded` \| `transcribing` \| `detecting` \| `ready` \| `failed` |
| `transcript` | jsonb | word-timed transcript |
| `error` | text | nullable |
| `created_at` | timestamptz | |

### 8.3 `clips` (detected candidates + edits)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `video_id` | uuid (FK) | |
| `user_id` | uuid (FK) | denormalized for RLS |
| `start_sec` / `end_sec` | numeric | detection bounds (editable) |
| `score` | int | 0–100 engagement score |
| `title` | text | AI hook/title |
| `transcript_slice` | jsonb | words within the clip |
| `edit_config` | jsonb | trim/captions/transitions/effects (see editor PRD §5) |
| `status` | text | `candidate` \| `queued` \| `rendering` \| `ready` \| `failed` |
| `output_key` | text | R2 key of rendered MP4, nullable |
| `created_at` | timestamptz | |

### 8.4 `credit_ledger` (source of truth for credits)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | |
| `delta` | int | + for grants/purchases, − for spends |
| `reason` | text | `signup_grant` \| `purchase` \| `render` \| `refund` \| `adjustment` |
| `ref_id` | uuid | related clip/render/stripe id, nullable |
| `created_at` | timestamptz | |

> `profiles.credit_balance` = sum of ledger deltas. The ledger is authoritative;
> the balance column is a cache updated transactionally.

### 8.5 `render_jobs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `clip_id` | uuid (FK) | |
| `user_id` | uuid (FK) | |
| `idempotency_key` | text (unique) | prevents double-charge/double-render |
| `status` | text | `queued` \| `active` \| `completed` \| `failed` |
| `attempts` | int | |
| `error` | text | nullable |
| `created_at` / `updated_at` | timestamptz | |

### 8.6 `subscriptions` / `purchases` (Stripe mirror)
Mirror of Stripe customer, subscription/plan, and one-off credit-pack purchases
(updated via Stripe webhooks). Used to reconcile entitlements.

---

## 9. Credits & billing

### 9.1 Why credits (not pure subscription)
Compute cost is dominated by **render minutes** (Remotion/Chromium) and
**transcription minutes**. Credits map spend to actual cost and keep margins
predictable, while still offering subscriptions for committed users.

### 9.2 What costs credits
| Action | Charged? | Rationale |
|---|---|---|
| Upload | No | cheap |
| Transcription + clip detection (processing a source video) | **Yes — per source minute** | real ASR + LLM cost |
| Live preview / editing | **No** | runs in browser, free |
| Render a clip to MP4 | **Yes — per output (flat or per output-minute)** | Remotion render cost |
| Re-render same clip after edits | Yes | new compute |
| Download an already-rendered clip | No | already paid |

> Decision to finalize before launch: charge processing per **source minute**
> (predictable) and rendering per **clip** (simple) — exact numbers set by a
> cost spreadsheet so each charge > its compute cost. Show estimated credit
> cost **before** the user confirms.

### 9.3 Plans (illustrative — finalize with cost model)
| Plan | Price | Monthly credits | Limits | Watermark |
|---|---|---|---|---|
| Free | $0 | small starter grant | ≤30 min uploads, retention 7d | yes |
| Creator | ~$19/mo | enough for ~X videos | ≤2 hr uploads, retention 30d | no |
| Pro | ~$49/mo | higher | longer uploads, priority render | no |
| Credit packs | one-off | top-ups | — | per plan |

### 9.4 Billing mechanics
- Stripe Checkout for subscriptions and credit packs.
- Stripe webhooks → update `subscriptions`/`purchases` → grant credits via
  `credit_ledger`.
- **Credit debit happens atomically at render request**: in one DB transaction,
  check balance ≥ cost, insert a negative ledger row, update balance cache,
  create the render job with an idempotency key. If the render **fails
  permanently**, auto-refund via a `refund` ledger row.
- Never debit on preview. Never double-charge on retry (idempotency key).

---

## 10. System architecture

### 10.1 Components
```
[ Next.js 15 (Vercel): web app + API routes + middleware ]
        |  reads/writes auth + data
        v
[ Supabase: Auth + Postgres + RLS ]        [ Cloudflare R2: source video + outputs ]
        |
        |  enqueue jobs
        v
[ Redis + BullMQ queue ] --> [ Worker(s): FFmpeg + ASR call + LLM detection ] --> [ Remotion Lambda: final render ]
                                            |
                                            v
                                   [ ASR (Whisper) + LLM provider ]
```

### 10.2 Tech stack
- **Frontend/app:** Next.js 15 (App Router, TS), TailwindCSS v4, Shadcn UI,
  Remotion `<Player>` for preview. Hosted on Vercel.
- **Auth/DB:** Supabase (Postgres, Auth, RLS, Storage optional). Drizzle ORM.
- **Object storage:** Cloudflare R2 (source videos + rendered MP4s), presigned
  uploads/downloads.
- **Queue:** Redis + BullMQ for processing and render jobs.
- **Media:** FFmpeg (audio extract, crop/scale, encode); Remotion + Remotion
  Lambda for caption/transition rendering.
- **AI:** Whisper-class ASR for transcription; an LLM for clip detection
  (and later titles/hashtags). When integrating an LLM, **default to the latest
  Claude models** unless cost testing dictates otherwise.
- **Payments:** Stripe (Checkout + webhooks).
- **Mobile (later):** Expo / React Native sharing the design tokens.

### 10.3 Where work runs
- Vercel functions are **not** suitable for long video jobs (timeouts) →
  processing and rendering run on a **worker** (a small always-on box or
  container running BullMQ consumers) and/or **Remotion Lambda**. The Next app
  only enqueues jobs and reads status.

### 10.4 Async status updates
- Client polls job status, or uses Supabase Realtime to subscribe to row
  changes on `videos`/`clips` for live progress (preferred — no polling).

---

## 11. Non-functional requirements

| Area | Requirement |
|---|---|
| **Performance** | Editor preview must play smoothly (no jank) at 1080×1920. Time-to-first-clip-candidate target < a few minutes for a 30-min video. |
| **Reliability** | Render success ≥ 98%; failed renders auto-refund credits; jobs retry with backoff, capped attempts. |
| **Scalability** | Stateless app; horizontal worker scaling; render scales via Lambda concurrency. |
| **Security** | RLS on every user table; secrets server-only; presigned, expiring storage URLs; Stripe webhook signature verification; never expose `service_role` key to the browser. |
| **Privacy** | User videos are private; documented retention; delete-account removes data. |
| **Cost** | Every credit-charged action must cost less in compute than the credits consumed; monitor per-render cost. |
| **Accessibility** | WCAG AA contrast in **both** light and dark themes (the common glassmorphism failure is unreadable dim text on light frost — test it). |
| **Observability** | Structured logs, job metrics (queue depth, durations, failures), error tracking (e.g. Sentry), basic product analytics. |
| **Compliance** | Stripe handles card data (no PCI scope for us). Clear ToS for URL ingestion / content ownership. |

---

## 12. Analytics & events (instrument from day one)
Track: `signup`, `login`, `video_uploaded`, `processing_started`,
`processing_completed`, `clips_detected` (count, scores), `clip_opened`,
`render_requested`, `render_completed`, `render_failed`, `clip_downloaded`,
`credits_purchased`, `plan_upgraded`. These power the §2.3 metrics.

---

## 13. Build roadmap (solo-founder sequencing)

> Build in vertical slices that are each shippable. Don't build the whole data
> model and all screens before anything works end to end.

**Phase 0 — Foundation (✅ done)**
Auth (email + Google), app shell, theming, deploy pipeline (Vercel + Supabase).

**Phase 1 — Ingest + transcribe (prove the pipeline)**
Upload to R2 → worker extracts audio → transcribe → store transcript → show
status. No clips yet. Success = transcript appears for an uploaded video.

**Phase 2 — Clip detection**
LLM over transcript → candidate clips with scores/titles → Clip Picker list.
Success = good candidates appear for a real podcast.

**Phase 3 — Static render (one style)**
Remotion composition: hardcoded caption style, render one clip server-side to
MP4 in R2, downloadable from History. Success = a captioned vertical MP4 exists.

**Phase 4 — Live editor**
Remotion `<Player>` preview + editable caption text + trim, driven by
`edit_config`. Render button reuses Phase 3. Success = preview == export.

**Phase 5 — Credits + billing**
Ledger, signup grant, debit-on-render with idempotency + auto-refund, Stripe
Checkout + webhooks for packs/subscriptions. Success = a paid render works.

**Phase 6 — Polish & presets**
More caption presets, transitions, effects toggles, aspect ratios, bulk render,
retention/cleanup jobs, analytics dashboards.

**Phase 7 — Fast-follows**
Direct publish/schedule, native mobile (Expo), brand kits, AI titles/hashtags.

> If you stop after **Phase 4**, you already have a usable product (free
> renders). Phase 5 makes it a business.

---

## 14. Risks & mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Render compute cost > revenue | Kills margin | Charge per render from a cost model; start on Remotion Lambda; cap free renders + watermark. |
| Clip detection quality is mediocre | Core value fails | Iterate prompts on real podcasts; tune duration/boundary guardrails; let users adjust trim. |
| Long jobs time out / fail | Bad UX, lost credits | Workers + queue (not Vercel functions); retries; auto-refund on permanent failure. |
| Solo-founder ops overload | Stalls everything | Managed services (Supabase, Lambda, Stripe); ship vertical slices; defer self-hosting. |
| URL/YouTube ingestion legal/ToS | Account/legal risk | Make it opt-in with rights confirmation; treat as fast-follow, file upload is primary. |
| Caption readability across themes | Looks broken | Enforce WCAG AA in both themes; QA on light frost specifically. |
| Vendor lock-in (Remotion/Supabase) | Future cost | Keep `edit_config` engine-agnostic; isolate provider calls behind interfaces. |

---

## 15. Open questions (decide before/while building)
1. Exact credit pricing per processing-minute and per render (needs a cost
   spreadsheet from real ASR + Lambda numbers).
2. Is URL/YouTube ingestion in MVP or fast-follow? (Recommend: fast-follow.)
3. Retention windows per plan (storage cost vs. user expectation).
4. Which ASR and which LLM provider for detection (quality vs. cost bake-off).
5. Free-tier watermark: on by default? (Recommend: yes.)
6. Active-speaker reframing — accept static center-crop for MVP? (Recommend: yes.)

---

## 16. Glossary
- **Source video / project:** the long video the user uploads.
- **Clip / candidate:** an AI-detected segment that can be rendered.
- **Render:** producing the final MP4 from a clip's `edit_config`.
- **Credit:** the spendable unit; granted, purchased, debited on render.
- **edit_config:** the single JSON object describing a clip's trim, captions,
  transitions, and effects — drives both preview and export.

---

*End of master PRD. See the editor and navigation/theming addenda in this
folder for deeper UI detail. This product does not and will not include any
wardrobe/fashion ("AI Trial Room") functionality.*