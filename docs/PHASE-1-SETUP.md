# Cliporo AI — Phase 1 Setup (Upload + Transcription)

This phase adds real video upload (Supabase Storage) and transcription
(AssemblyAI). Do these 3 things once, then it works locally and on Vercel.

## 1. Create the database table + storage bucket
1. Open your Supabase project -> **SQL Editor** -> **New query**.
2. Open the file `supabase/migrations/0001_videos.sql` in this repo, copy ALL
   of it, paste into the editor, and click **Run**.
3. This creates the `videos` table, turns on Row Level Security (so users only
   see their own videos), and creates a private `videos` storage bucket with
   matching access rules. It is safe to re-run.

## 2. Get an AssemblyAI API key
1. Sign up at **https://www.assemblyai.com** (free starter credits).
2. In the dashboard, copy your **API key**.

## 3. Add the key to your environment
- **Local:** open `.env.local` and set:
  ```
  ASSEMBLYAI_API_KEY=your-real-key-here
  ```
  Then restart `npm run dev`.
- **Vercel:** Project -> **Settings** -> **Environment Variables** -> add
  `ASSEMBLYAI_API_KEY` with the same value, then redeploy.

> `ASSEMBLYAI_API_KEY` has **no** `NEXT_PUBLIC_` prefix on purpose — it is a
> server-only secret and must never reach the browser.

## How it works (the flow)
1. You pick a video on **/create** -> it uploads straight to your Supabase
   Storage `videos` bucket, and a row is added to the `videos` table.
2. The app calls `POST /api/transcribe`, which makes a temporary signed URL to
   your file and sends it to AssemblyAI. Status becomes **transcribing**.
3. The project page (**/projects/[id]**) polls `POST /api/videos/[id]/refresh`
   every few seconds. When AssemblyAI finishes, the word-timed transcript is
   saved and the status flips to **ready** — the transcript appears.

## Notes / limits
- Transcription runs on AssemblyAI's servers, so this works on Vercel without
  any separate worker — good for now.
- Very large uploads are limited by your Supabase plan's storage file-size
  limit. Increase it in Supabase if needed.
- **Next (PRD Phase 2):** feed the transcript to an LLM to detect clip
  candidates with scores — that needs an LLM API key.