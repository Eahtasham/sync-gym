import { Dumbbell } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUserId, getProfiles } from "@/lib/auth";
import { LockScreen } from "./lock-screen";

export default async function LockPage() {
  if (await getCurrentUserId()) redirect("/dashboard");

  const profiles = await getProfiles();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 safe-top safe-bottom">
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Dumbbell className="size-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Sync Gym</h1>
      </div>
      <LockScreen profiles={profiles} />
    </main>
  );
}
