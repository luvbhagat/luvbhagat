import { Clock } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">History</h1>

      <div className="glass flex flex-col items-center gap-3 rounded-2xl p-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Clock className="size-6" />
        </span>
        <p className="text-sm text-muted-foreground">
          Rendered clips ready to download will show up here.
        </p>
      </div>
    </div>
  );
}