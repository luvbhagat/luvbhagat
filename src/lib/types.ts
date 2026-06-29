// Shared shapes for the video pipeline.

export type VideoStatus =
  | "uploaded"
  | "importing"
  | "transcribing"
  | "analyzing"
  | "rendering"
  | "ready"
  | "failed";

export type TranscriptWord = { text: string; start: number; end: number };
export type Transcript = { text: string; words: TranscriptWord[] };

export type Video = {
  id: string;
  user_id: string;
  title: string;
  storage_path: string | null;
  source_url: string | null;
  status: VideoStatus;
  assemblyai_id: string | null;
  transcript: Transcript | null;
  duration_sec: number | null;
  error: string | null;
  created_at: string;
};
export type ClipStatus =
  | "candidate"
  | "queued"
  | "rendering"
  | "ready"
  | "failed";

export type Clip = {
  id: string;
  video_id: string;
  user_id: string;
  start_sec: number;
  end_sec: number;
  score: number;
  title: string;
  transcript_slice: Transcript | null;
  status: ClipStatus;
  output_key: string | null;
  edit_config: EditConfig | null;
  created_at: string;
};
export type CaptionStyle = "karaoke" | "reveal" | "clean";
export type CaptionPosition = "bottom" | "center" | "top";

export type EditConfig = {
  trim: { startSec: number; endSec: number };
  captions: {
    style: CaptionStyle;
    position: CaptionPosition;
    accent: string;
  };
};

export const DEFAULT_ACCENT = "#5fd0ff";