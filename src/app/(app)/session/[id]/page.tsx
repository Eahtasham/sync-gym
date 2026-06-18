import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SessionEditor } from "@/components/session/session-editor";
import { getSessionForEdit } from "@/lib/queries/session";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionForEdit(id);
  if (!session) notFound();

  return (
    <div>
      <PageHeader title={session.day.name} subtitle="Active workout" backHref="/dashboard" />
      <SessionEditor session={session} />
    </div>
  );
}
