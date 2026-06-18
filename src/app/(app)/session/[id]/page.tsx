import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SessionEditor } from "@/components/session/session-editor";
import { getSessionForEdit } from "@/lib/queries/session";
import { getAllExercises } from "@/lib/queries/workouts";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, allExercises] = await Promise.all([
    getSessionForEdit(id),
    getAllExercises(),
  ]);
  if (!session) notFound();

  // Remount the editor when the set of logged exercises changes (add/remove).
  const editorKey = [
    ...session.strength.map((s) => s.logId),
    ...session.cardio.map((c) => c.logId),
  ].join(",");

  return (
    <div>
      <PageHeader title={session.day.name} subtitle="Active workout" backHref="/dashboard" />
      <SessionEditor key={editorKey} session={session} library={allExercises} />
    </div>
  );
}
