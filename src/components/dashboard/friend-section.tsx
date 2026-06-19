import { CalendarDays, Dumbbell, Flame, Scale, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { friendlyDate, kg } from "@/lib/format";
import type { FriendSummary } from "@/lib/queries/dashboard";

export function FriendSection({ friend }: { friend: FriendSummary }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Users className="size-5 text-primary" /> {friend.name}
      </h2>
      <Card className="gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Metric
            icon={Flame}
            label="Streak"
            value={friend.streak > 0 ? `${friend.streak} day${friend.streak === 1 ? "" : "s"}` : "—"}
          />
          <Metric icon={CalendarDays} label="This week" value={`${friend.weekCount}`} />
          <Metric
            icon={Scale}
            label="Bodyweight"
            value={friend.bodyweightKg != null ? kg(friend.bodyweightKg) : "—"}
          />
          <Metric
            icon={Dumbbell}
            label="Heaviest"
            value={friend.heaviest ? kg(friend.heaviest.weight) : "—"}
            sub={friend.heaviest?.exercise}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {friend.lastWorkout
            ? `Last trained ${friendlyDate(friend.lastWorkout)} · ${friend.monthCount} this month`
            : "No workouts logged yet"}
        </p>
      </Card>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-0.5 font-semibold">{value}</div>
      {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
