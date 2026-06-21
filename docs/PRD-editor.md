# AuraClip AI — PRD Addendum v2.2
## Clip Editor (Live Preview, Captions & Transitions)

Amends PRD v2.0 / v2.1. This section replaces the earlier "Captions (single
style)" and "Render Pipeline" assumptions where they conflict, because moving
to a **live in-browser preview** changes the rendering technology.

---

## 0. Architectural decision (read first)

The clip editor uses **Remotion** (https://remotion.dev) as the rendering
engine for captions, text animation, and transitions — NOT FFmpeg ASS
subtitles.

**Why:** Remotion renders video from React components. The same components that
play live in the browser preview are used to render the final MP4 server-side.
One source of truth → the preview matches the export exactly. ASS subtitles
cannot be previewed live in a browser, so they are dropped for caption
animation.

**FFmpeg is still used** for: audio extraction (transcription input), source
video decoding, the initial 9:16 crop/scale, and final encoding. Remotion
itself orchestrates FFmpeg under the hood during server render. So the stack
is: **FFmpeg for media prep + Remotion (React) for captions/animation/transitions + Remotion server render for final output.**

### Cost/complexity warning (solo founder)
Server-side Remotion rendering runs **headless Chromium** per render job. This
is heavier than a plain FFmpeg process: more RAM, longer cold starts. Plan for:
- Render workers need ~2GB+ RAM each (Chromium + encoding).
- This is the single most resource-intensive part of the app.
- Recommend Remotion **Lambda** (their managed serverless render) for MVP
  instead of self-hosting render workers — it removes most of the ops burden,
  which matters a lot when you're solo. Self-host later if cost demands it.

---

## 1. Editor scope (MVP)

A user opens a selected clip candidate and can:

1. **Trim** — adjust clip start/end on a timeline scrubber.
2. **Edit caption text** — correct AI transcription errors; captions are
   word-timed from Whisper.
3. **Pick a caption animation style** — from a preset list (below).
4. **Pick a caption position & size** — bottom third (default), center, top.
5. **Toggle transitions** — applied at clip start/end and optionally on scene/
   sentence breaks (preset list below).
6. **Live preview** — play the clip with captions + transitions rendering in
   real time in the browser.
7. **Render** — server renders the final 1080×1920 MP4 from the same config.

Explicitly **out of scope for MVP** (defer): multi-clip stitching, B-roll
overlays, manual keyframing, audio mixing/music, manual emoji placement
(auto-emoji stays a later toggle), green-screen/background removal.

---

## 2. Caption animation styles (presets)

Each preset is a Remotion component driven by word-level timestamps. MVP ships
4–5; more added later.

| Preset | Behavior |
|---|---|
| **Karaoke Pop** | Words appear word-by-word, active word scales up + accent color highlight (the signature short-form look). |
| **Word Reveal** | Each word fades/slides up as spoken; past words stay dimmed. |
| **Bounce** | Active word does a subtle spring/bounce scale on its onset. |
| **Typewriter** | Characters/words type in sequentially in sync with speech. |
| **Clean Lines** | Whole-phrase captions, no per-word animation (minimal, fastest to render). |

Each preset exposes the same editable props: font, text color, highlight/accent
color, stroke/shadow, size, position, max words per line. These map to the
theme accent colors by default (pink/cyan/amber).

---

## 3. Transitions (presets)

Applied at clip in/out and optionally at sentence boundaries. Keep short
(150–400ms) so they don't eat the clip.

| Transition | Use |
|---|---|
| **Cut** | No transition (default between sentences). |
| **Fade** | Fade from/to black or transparent at clip in/out. |
| **Slide** | Push/slide in a direction — good for scene changes. |
| **Zoom punch** | Quick scale-in on emphasis (pairs with the "zoom on emphasis" effect). |
| **Whip/blur** | Fast motion-blur swipe between segments (use sparingly). |

Transition choices are stored on the clip config and rendered by Remotion.

---

## 4. Editor UI layout

Reuses the bottom-tab shell (Editor is reached from a clip; tab bar may be
hidden for an immersive editing mode — see v2.1 §C).

```
┌─────────────────────────────┐
│  ← Clip title      [Render]  │  contextual header
├─────────────────────────────┤
│                              │
│      LIVE PREVIEW            │  Remotion <Player>, 9:16, plays in browser
│   (captions animate here)    │  with play/pause + scrubber
│                              │
├─────────────────────────────┤
│  ◀━━━●━━━━━━━━━━━▶  00:12/0:46│  trim scrubber (drag handles = in/out)
├─────────────────────────────┤
│ [Captions] [Style] [Transitions] [Effects]   ← tab strip
│                              │
│  (panel for the active tab:  │
│   - Captions: editable text  │
│   - Style: preset swatches,  │
│     color, size, position    │
│   - Transitions: preset list │
│   - Effects: zoom, emoji,    │
│     watermark toggles)       │
└─────────────────────────────┘
```

- **Live preview** = Remotion `<Player>` component (this is the browser preview
  piece of Remotion; it does NOT require a server render to play).
- **Render** button = sends the clip config to the server / Remotion Lambda to
  produce the downloadable MP4. Costs credits (charge on render, not on
  preview — preview is free and local).

---

## 5. Data model changes

Extend the `clips` table config (or add a `clip_edit_config` jsonb column):

```
clips.editConfig (jsonb) = {
  trim: { startSec, endSec },
  captions: {
    style: "karaoke_pop" | "word_reveal" | ...,
    font, textColor, accentColor, size, position,
    maxWordsPerLine,
    // edited transcript words (overrides AI transcript if user fixed text)
    words: [{ text, start, end }] | null
  },
  transitions: { in: "fade", out: "fade", betweenSentences: "cut" },
  effects: { zoomOnEmphasis: bool, autoEmoji: bool, watermark: bool },
  aspectRatio: "9:16" | "1:1" | "4:5"
}
```

This single config object is what both the live `<Player>` and the server
render consume — guaranteeing preview == output.

## 6. Render flow changes

```
User edits in browser  ──(live, free)──►  Remotion <Player> preview
        │
        │ click Render (debit credits FIRST, per existing credit ledger)
        ▼
  enqueue render job (BullMQ)  ──►  worker calls Remotion render
                                     (Lambda for MVP) with editConfig
        │
        ▼
  output MP4 ──► upload to R2 ──► clip.status = ready ──► appears in History
```

Credit handling, idempotency, retries, failure states — all unchanged from
PRD v2.0. The only change is the renderer the worker invokes.

---

## 7. Build sequencing (so this doesn't stall you)

Do NOT build all of this at once. Order:

1. Static Remotion composition: hardcoded clip + one caption style, render it
   server-side to a file. Prove the pipeline end to end.
2. Add the `<Player>` live preview in the editor with that one style.
3. Make caption text editable; wire word timestamps from the real transcript.
4. Add the remaining caption presets one at a time.
5. Add trim handles.
6. Add transitions.
7. Add effects toggles (zoom, emoji, watermark).

Each step should be shippable on its own. If you stop after step 3 you still
have a working, sellable editor.

---

## 8. What did not change
- Bottom tab navigation (v2.1) — Editor still reached from a clip card.
- Light/dark glassmorphism theming (v2.1) — applies to the editor chrome; the
  preview canvas itself shows the actual video.
- All backend/billing/queue architecture from v2.0.
- No wardrobe/fashion feature (not part of this product).
