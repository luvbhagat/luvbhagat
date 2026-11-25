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

// How a clip's caption words animate in the preview and the final render.
export type CaptionStyle =
  | "karaoke"
  | "reveal"
  | "clean"
  | "bounce"
  | "typewriter";
export type CaptionPosition = "bottom" | "center" | "top";

// Vertical 9:16 framing template for the clip.
//   fill    — fill the frame (center crop). Classic single-speaker short.
//   fit     — fit the whole frame inside, blurred fill behind (no cropping).
//   gaming  — facecam on top, gameplay on the bottom (split screen).
//   podcast — speaker centered on a soft blurred backdrop.
export type ClipLayout = "fill" | "fit" | "gaming" | "podcast";

// AI estimate of how likely a clip is to go viral. Each field is 0-100.
export type HypeBreakdown = {
  hook: number; // strength of the first ~3 seconds
  emotion: number; // emotional pull
  shareability: number; // likelihood someone shares it
  trend: number; // fit with current short-form trends
};

export type EditConfig = {
  trim: { startSec: number; endSec: number };
  layout: ClipLayout;
  captions: {
    style: CaptionStyle;
    position: CaptionPosition;
    accent: string;
    size: number; // relative caption scale (1 = default)
    // When the user edits caption text, we store the corrected words here
    // (timing preserved from the transcript). null = use the transcript as-is.
    words: TranscriptWord[] | null;
  };
};

export type Clip = {
  id: string;
  video_id: string;
  user_id: string;
  start_sec: number;
  end_sec: number;
  score: number; // overall hype / virality score 0-100
  hype: HypeBreakdown | null; // per-factor breakdown (null for older clips)
  title: string;
  transcript_slice: Transcript | null;
  status: ClipStatus;
  output_key: string | null;
  edit_config: EditConfig | null;
  created_at: string;
};

export const DEFAULT_ACCENT = "#5fd0ff";
export const DEFAULT_LAYOUT: ClipLayout = "fill";
export const DEFAULT_CAPTION_SIZE = 1;

// The config a clip starts from before the user edits anything.
export function defaultEditConfig(startSec: number, endSec: number): EditConfig {
  return {
    trim: { startSec, endSec },
    layout: DEFAULT_LAYOUT,
    captions: {
      style: "karaoke",
      position: "bottom",
      accent: DEFAULT_ACCENT,
      size: DEFAULT_CAPTION_SIZE,
      words: null,
    },
  };
}
