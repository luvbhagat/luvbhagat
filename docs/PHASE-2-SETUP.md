# Cliporo AI — Phase 2 Setup (AI Clip Detection)

Phase 2 adds AI that reads a video's transcript and picks the best moments to
turn into short clips. It uses Claude (Anthropic).

## 1. Run the database migration
Supabase -> SQL Editor -> New query -> paste ALL of
`supabase/migrations/0002_clips.sql` -> Run. This creates the `clips` table
with Row Level Security.

## 2. Get an Anthropic API key
1. Go to **https://console.anthropic.com**, sign in, and open **API keys**.
2. **Create key** and copy it.
3. Add billing/credits on the same site (clip detection costs a small amount
   of Claude usage per video).

## 3. Add the key to your environment
- **Local:** add to `.env.local`, then restart `npm run dev`:
  ```
  ANTHROPIC_API_KEY=your-real-key-here
  ```
- **Vercel:** Settings -> Environment Variables -> add `ANTHROPIC_API_KEY`,
  then redeploy.

> Server-only secret — no `NEXT_PUBLIC_` prefix.

## How it works
1. After a video reaches **Ready**, open it under **/projects/[id]** and click
   **Find clips with AI**.
2. `POST /api/videos/[id]/detect` sends the timestamped transcript to Claude
   (`claude-opus-4-8`) using a forced tool call, so the response is always
   clean JSON: a list of clip candidates with `startSec`, `endSec`, a title,
   a 0-100 score, and the best quote.
3. Each candidate is saved to the `clips` table (with its word-level transcript
   slice) and shown on the project page, highest score first.

## Notes
- The model is set to `claude-opus-4-8` in `src/app/api/videos/[id]/detect/route.ts`.
- Detection runs once per video (it skips if clips already exist). To re-run,
  delete that video's rows from the `clips` table.
- **Next (PRD Phase 3-4):** open a clip in an editor to add animated captions,
  trim, and render a downloadable vertical MP4 (needs Remotion + a render host).