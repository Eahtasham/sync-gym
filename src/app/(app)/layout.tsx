import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { BottomNav } from "@/components/nav/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth (middleware already gates these routes).
  if (!(await getCurrentUserId())) redirect("/lock");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <main className="flex-1 px-4 pt-6 pb-nav">{children}</main>
      <BottomNav />
    </div>
  );
}
