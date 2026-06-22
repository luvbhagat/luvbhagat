// Shared shapes for the video pipeline.

export type VideoStatus = "uploaded" | "transcribing" | "ready" | "failed";

export type TranscriptWord = { text: string; start: number; end: number };
export type Transcript = { text: string; words: TranscriptWord[] };

export type Video = {
  id: string;
  user_id: string;
  title: string;
  storage_path: string;
  status: VideoStatus;
  assemblyai_id: string | null;
  transcript: Transcript | null;
  duration_sec: number | null;
  error: string | null;
  created_at: string;
};