import { UploadForm } from "./upload-form";
import { YouTubeForm } from "./youtube-form";

export default function CreatePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Create clips</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a long video or paste a YouTube link, and Cliporo AI will find
          the best moments.
        </p>
      </div>

      <UploadForm />

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or paste a link
        <span className="h-px flex-1 bg-border" />
      </div>

      <YouTubeForm />
    </div>
  );
}
