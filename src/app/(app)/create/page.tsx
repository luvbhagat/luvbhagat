import { UploadForm } from "./upload-form";

export default function CreatePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Create clips</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a long video and AuraClip AI will find the best moments.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}