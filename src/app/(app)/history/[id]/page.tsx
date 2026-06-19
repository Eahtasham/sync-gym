import { notFound } from "next/navigation";
import { format } from "date-fns";
import { HeartPulse, StickyNote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { SessionActions } from "@/components/history/session-actions";
import { getSessionDetail } from "@/lib/queries/history";
import { requireUser } from "@/lib/auth";
import { duration, kg, km, setsSummary } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const session = await getSessionDetail(id, user.id);
  if (!session) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title={session.workoutDay.name}
        subtitle={format(session.sessionDate, "EEEE, d MMM yyyy")}
        backHref="/history"
      />

      <SessionActions sessionId={session.id} />

      {session.exerciseLogs.map((log) => (
        <Card key={log.id} className="gap-2 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{log.exercise.name}</h3>
            <span className="text-xs text-muted-foreground">
              {setsSummary(log.sets)}
            </span>
          </div>
          <div className="divide-y divide-border/60">
            {log.sets.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="text-muted-foreground">Set {s.setNumber}</span>
                <span className="font-medium">
                  {s.reps} reps {s.weight > 0 && `× ${kg(s.weight)}`}
                </span>
              </div>
            ))}
          </div>
          {log.notes && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <StickyNote className="mt-0.5 size-3.5 shrink-0" />
              {log.notes}
            </p>
          )}
        </Card>
      ))}

      {session.cardioLogs.map((c) => (
        <Card key={c.id} className="gap-2 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <HeartPulse className="size-4 text-chart-2" />
              {c.exercise?.name ?? "Cardio"}
            </h3>
            <Badge variant="secondary" className="text-chart-2">Cardio</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="Duration" value={duration(c.durationMinutes)} />
            <Stat label="Distance" value={km(c.distanceKm)} />
            {c.avgSpeedKmh != null && (
              <Stat label="Avg speed" value={`${c.avgSpeedKmh} km/h`} />
            )}
            {c.calories != null && <Stat label="Calories" value={`${c.calories}`} />}
          </div>
          {c.notes && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <StickyNote className="mt-0.5 size-3.5 shrink-0" />
              {c.notes}
            </p>
          )}
        </Card>
      ))}

      {session.notes && (
        <Card className="p-4">
          <h3 className="mb-1 text-sm font-semibold">Session notes</h3>
          <p className="text-sm text-muted-foreground">{session.notes}</p>
        </Card>
      )}

      {session.exerciseLogs.length === 0 && session.cardioLogs.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nothing was logged in this session.
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
