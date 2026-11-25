# Cliporo AI — Phase 3b Setup (Render to MP4, local FFmpeg worker)

This makes the **Render clip** button produce a real downloadable vertical MP4
with captions burned in. It uses **FFmpeg on your own machine** — no AWS, no
Remotion, no paid license.

## What you need
- **FFmpeg** installed and on your PATH. Check with: `ffmpeg -version`
  - Windows: `winget install Gyan.FFmpeg` (then reopen your terminal)
  - Mac: `brew install ffmpeg`
- Your **Supabase service-role key** (a master key — local use only).

## 1. Run the database migration
Supabase -> SQL Editor -> paste ALL of `supabase/migrations/0004_renders.sql`
-> Run. This creates a private `renders` storage bucket.

## 2. Add the service-role key to .env.local
Supabase -> Settings -> API -> Project API keys -> copy **service_role**:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
> Keep this secret. It is only ever used by the local worker, never the browser.
> It is already covered by .gitignore (.env.local is never committed).

## 3. Render a clip
1. In the editor, set up a clip and click **Render clip** -> it becomes
   **queued**.
2. In a terminal in the project folder, run:
   ```
   npm run worker
   ```
3. The worker downloads the source, burns in the captions with FFmpeg
   (1080x1920, your chosen style/position/color/trim), uploads the MP4, and
   marks the clip **ready**.
4. Open **History** -> **Download**.

Re-run `npm run worker` whenever you have queued clips. (It processes all
queued clips, then exits.)

## How it works
- `POST /api/clips/[clipId]/render` just sets the clip status to `queued`
  (Vercel can't run FFmpeg).
- `worker/render.mjs` is a small Node script that does the actual rendering and
  writes results back to Supabase using the service-role key.
- Captions come from each word's timing (`transcript_slice`) plus your
  `edit_config`, generated as an ASS subtitle and burned in by FFmpeg.

## Going to production later
For a hosted, automatic render pipeline (no manual `npm run worker`), you'd run
this same worker on an always-on server/container with a job queue, or switch
to Remotion Lambda (AWS) per the PRD. The worker is structured so that move is
straightforward.