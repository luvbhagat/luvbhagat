import { cn } from "@/lib/utils";
import type { VideoStatus } from "@/lib/types";

const STYLES: Record<VideoStatus, { label: string; cls: string }> = {
  uploaded: { label: "Uploaded", cls: "bg-secondary text-muted-foreground" },
  importing: { label: "Importing…", cls: "bg-brand-cyan/20 text-brand-cyan" },
  transcribing: { label: "Transcribing…", cls: "bg-brand-cyan/20 text-brand-cyan" },
  analyzing: { label: "Finding clips…", cls: "bg-brand-cyan/20 text-brand-cyan" },
  rendering: { label: "Rendering…", cls: "bg-brand-cyan/20 text-brand-cyan" },
  ready: { label: "Ready", cls: "bg-emerald-500/20 text-emerald-400" },
  failed: { label: "Failed", cls: "bg-destructive/20 text-destructive" },
};

export function StatusBadge({ status }: { status: VideoStatus }) {
  const s = STYLES[status] ?? STYLES.uploaded;
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", s.cls)}>
      {s.label}
    </span>
  );
}