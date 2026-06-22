import { redirect } from "next/navigation";

// The home screen moved to /home. Keep /dashboard working by redirecting.
export default function DashboardPage() {
  redirect("/home");
}