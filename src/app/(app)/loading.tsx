// Shown instantly during navigation while the signed-in page renders on the
// server. Turns a blank/frozen wait into an immediate, on-brand skeleton.
export default function AppLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true">
      <div className="h-8 w-40 rounded-lg bg-secondary" />
      <div className="glass h-24 rounded-2xl" />
      <div className="flex flex-col gap-3">
        <div className="h-5 w-32 rounded bg-secondary" />
        <div className="glass h-20 rounded-2xl" />
        <div className="glass h-20 rounded-2xl" />
        <div className="glass h-20 rounded-2xl" />
      </div>
    </div>
  );
}
