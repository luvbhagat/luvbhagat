import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/app/bottom-nav";

// Shared shell for all signed-in screens. Protects the routes (belt-and-
// suspenders with middleware) and renders the bottom tab bar under every page.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pt-6 pb-32">
      {children}
      <BottomNav />
    </div>
  );
}