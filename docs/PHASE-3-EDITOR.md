# AuraClip AI — Phase 3 Setup (Clip Editor)

Phase 3 adds an in-browser clip editor: a live 9:16 preview of the source
video with animated captions, caption-style presets, a highlight color, and
trim controls. Your edits are saved to each clip's `edit_config`.

## 1. Run the database migration
Supabase -> SQL Editor -> New query -> paste ALL of
`supabase/migrations/0003_edit_config.sql` -> Run. This adds an `edit_config`
column to the `clips` table.

(No new API keys are needed for the editor — it runs entirely in the browser.)

## How to use it
1. Open a video at **/projects/[id]** and click a detected clip.
2. The editor (**/projects/[id]/clips/[clipId]**) shows a vertical preview of
   that moment with word-timed captions.
3. Pick a caption style (Karaoke Pop / Word Reveal / Clean Lines), a position,
   and a highlight color. Adjust the trim. Press **Play preview**.
4. Click **Save changes** to store your `edit_config`.

## What is NOT done yet: rendering to MP4
The **Render clip** button currently returns a message instead of a file.

Video rendering (burning captions into a real MP4) needs a dedicated render
host — it **cannot run on Vercel's serverless functions**. The PRD recommends
**Remotion Lambda (AWS)**. This is the next setup step and involves:

- An **AWS account** + **Remotion Lambda** deployed (a render function + an S3
  bucket), or a small always-on render worker you host.
- A Remotion composition that draws the same captions you preview here, driven
  by the clip's `edit_config` (so the export matches the preview).
- Wiring `POST /api/clips/[clipId]/render` to enqueue the render, then storing
  the finished MP4 in Supabase Storage and flipping the clip to `ready`.
- Note: **Remotion requires a company license** above a small team size — check
  https://remotion.dev/license before commercial use.

When you're ready to set that up, that's Phase 3b (render pipeline).