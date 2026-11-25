import { BottomNav } from "@/components/app/bottom-nav";

// Every signed-in screen is per-user and cookie-based, so render on demand
// (never statically prerender). Applies to all pages in this (app) group.
export const dynamic = "force-dynamic";

// Shared shell for all signed-in screens. Route protection is handled by the
// middleware (src/middleware.ts), so we don't repeat a getUser() network call
// here — that keeps every page one round-trip lighter.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pt-6 pb-32">
      {children}
      <BottomNav />
    </div>
  );
}
