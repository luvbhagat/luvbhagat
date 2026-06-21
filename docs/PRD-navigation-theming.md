# AuraClip AI — PRD Addendum v2.1
## UI / Navigation & Theming Update

This addendum amends the **front-end specification** of PRD v2.0. Backend,
data model, queue, billing, and API sections are unchanged. Only navigation
structure and theming are affected.

---

## A. Navigation — Bottom Tab Bar (replaces top header nav)

### A.1 Change summary
Primary navigation moves from a top header bar to a **persistent bottom tab
bar**, matching modern mobile-first app conventions (and consistent with the
Expo mobile preview). The top of each screen now carries only a lightweight
**contextual header** (screen title + one or two contextual actions), not the
primary navigation.

### A.2 Bottom tab bar — items
The bar is fixed to the bottom of the viewport, glassmorphic, with 5 items:

| Tab | Icon | Destination | Notes |
|---|---|---|---|
| Home | house | Dashboard (credits, recent projects, upload entry) | Default landing tab |
| Projects | film/clapperboard | All source videos + their detected clips | Was "Photos" in the request — renamed to fit a video app |
| Create | + (center, raised, accent) | Opens upload / new-project flow | Center, visually emphasized (gradient circle, like the SparkButton) |
| History | clock-rewind | Render/export history (all rendered clips, downloads) | |
| Account | avatar/gear | Profile, plan, billing, settings | |

Design notes:
- The **Create (+)** action sits in the center, raised above the bar as a
  gradient circular button (reuse the pink→cyan SparkButton treatment), since
  "start a new clip" is the primary action of the whole app.
- Active tab: accent color (pink in dark / violet in light) + filled icon.
  Inactive: dimmed text/icon.
- The bar uses the glass treatment (frosted blur, 1px translucent border) so it
  floats over content.
- On the **web app** this same bar renders as a bottom bar on mobile widths and
  may optionally move to a left vertical rail on wide desktop viewports
  (≥1024px) — same items, same order.

### A.3 Contextual top header (per screen)
Each screen keeps a minimal top area:
- Left: back chevron (only on nested screens like the Editor) OR screen title
- Right: 1 contextual action max (e.g. "⋮" overflow menu, or the credits pill)
- The credits pill (e.g. "214 credits") moves here OR into the Account tab —
  recommended: keep a compact credits indicator in the top-right of Home only,
  full breakdown lives in Account.

### A.4 Routing impact (Next.js)
- App shell wraps all authenticated routes with a `<BottomTabBar />` layout.
- Routes: `/home`, `/projects`, `/create`, `/history`, `/account`.
- The tab bar is hidden on: auth screens (`/login`), and full-screen editor
  render preview if you want an immersive mode (optional).

---

## B. Light / Dark Mode with Glassmorphism

### B.1 Change summary
The app supports **light and dark themes**, switchable by the user and/or
following the OS setting. Both themes preserve the glassmorphism aesthetic
(frosted translucent surfaces, soft color blobs, blur) — only the base
background and text colors invert.

### B.2 Core rule
- **Light mode:** white / near-white base background. Dark text. Glass cards are
  light-tinted translucent (frosted white). Color blobs softened/lower opacity
  so the screen stays clean and readable.
- **Dark mode:** black / near-black base background (existing purple-violet
  gradient is the dark default). Light text. Glass cards are dark-tinted
  translucent. Color blobs more vivid.

Glassmorphism is preserved in both — the frosted blur, the 1px translucent
border, and the floating-surface feel do not change. What changes is whether
the frost is "frosted white over light" or "frosted dark over dark."

### B.3 Design tokens (theme-aware)

The single `theme/tokens.ts` becomes two token sets behind a `useTheme()` hook.
Accent colors (pink, cyan, amber) stay constant across themes for brand
consistency; only surfaces/text/background swap.

| Token | Light mode | Dark mode |
|---|---|---|
| `bg` (base) | `#FFFFFF` → soft `#F4F1FA` gradient | `#1a0e3a` → `#2e1454` gradient (existing) |
| `text` | `#1A1030` | `#F5F2FA` |
| `textDim` | `rgba(26,16,48,0.6)` | `rgba(245,242,250,0.62)` |
| `glass` (card fill) | `rgba(255,255,255,0.55)` | `rgba(255,255,255,0.08)` |
| `glassLine` (border) | `rgba(120,90,160,0.25)` | `rgba(255,255,255,0.16)` |
| `blur tint` | light | dark |
| blob opacity | ~0.25 (subtle) | ~0.5 (vivid) |
| accent: pink | `#ff5fa8` | `#ff5fa8` (unchanged) |
| accent: cyan | `#5fd0ff` | `#5fd0ff` (unchanged) |
| accent: amber | `#ffb347` | `#ffb347` (unchanged) |
| Active tab color | `#9b2fb0` (violet, for contrast on white) | `#ff5fa8` (pink) |

### B.4 Theme switching
- Default to **system preference** on first load (`prefers-color-scheme`).
- User can override via a toggle in **Account → Appearance** (System / Light /
  Dark).
- Persist choice (localStorage on web).

### B.5 Implementation notes
- Web: use a `ThemeProvider` (React context) exposing the active token set;
  apply via CSS variables on `:root` and a `data-theme="light|dark"` attribute
  so Tailwind + Shadcn can target both. Tailwind: enable `darkMode: "class"`
  (or `["class", '[data-theme="dark"]']`).
- Glass effect: `backdrop-blur` (Tailwind `backdrop-blur-xl`) + theme-aware
  translucent `bg` + `border`. Verify text contrast passes WCAG AA in **both**
  themes — the most common glassmorphism bug is unreadable dim text on the
  light frosted surface, so test that explicitly.
- Mobile (Expo, later): `useColorScheme()` from React Native drives the same
  token swap; reuse the shared `tokens.ts` structure.

---

## C. Updated Screen Inventory (no feature changes, layout only)

| Screen | Top (contextual) | Bottom tab visible? |
|---|---|---|
| Login | none | no |
| Home (Dashboard) | title + compact credits pill | yes |
| Projects | title + filter | yes |
| Create (upload) | back + title | yes (Create tab active) |
| Clip Picker | back + project name | yes |
| Editor | back + clip title + Render action | optional (immersive) |
| History | title | yes |
| Account / Billing | title + theme toggle | yes |

---

## D. What did NOT change
- All backend architecture, the Drizzle schema, credit ledger, BullMQ queues,
  FFmpeg pipeline, Stripe billing, and the API surface from PRD v2.0 are
  unchanged.
- No wardrobe / fashion-store feature is included — that belongs to a different
  product (AI Trial Room), not AuraClip.
- The core loop is still: upload → transcribe → detect clips → edit → render →
  download.
