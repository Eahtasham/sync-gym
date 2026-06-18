import Link from "next/link";
import { CalendarDays, ChevronRight, Dumbbell, HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { HistoryFilters } from "@/components/history/history-filters";
import {
  getHistory,
  getHistoryFilterOptions,
} from "@/lib/queries/history";
import { friendlyDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const [options, sessions] = await Promise.all([
    getHistoryFilterOptions(),
    getHistory({
      dayId: sp.dayId,
      exerciseId: sp.exerciseId,
      from: sp.from,
      to: sp.to,
    }),
  ]);

  return (
    <div>
      <PageHeader title="History" subtitle="Last 30 days of workouts" />
      <HistoryFilters days={options.days} exercises={options.exercises} />

      {sessions.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No workouts match your filters.
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Link key={s.id} href={`/history/${s.id}`}>
              <Card className="flex-row items-center gap-3 p-4 active:bg-accent">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  {s.cardioCount > 0 && s.exerciseCount === 0 ? (
                    <HeartPulse className="size-5" />
                  ) : (
                    <Dumbbell className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{s.dayName}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {friendlyDate(s.date)}
                    <span>·</span>
                    {s.exerciseCount > 0 && <span>{s.exerciseCount} exercises</span>}
                    {s.exerciseCount > 0 && s.cardioCount > 0 && <span>·</span>}
                    {s.cardioCount > 0 && <span>{s.cardioCount} cardio</span>}
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
