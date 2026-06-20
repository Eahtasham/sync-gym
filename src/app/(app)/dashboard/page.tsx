import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Flame,
  MapPin,
  Repeat,
  Timer,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { BodyweightCard } from "@/components/dashboard/bodyweight-card";
import { FriendSection } from "@/components/dashboard/friend-section";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { requireUser, getOtherUser } from "@/lib/auth";
import { getDashboardData, getFriendSummary } from "@/lib/queries/dashboard";
import { getPersonalRecords } from "@/lib/queries/records";
import { getWorkoutDays } from "@/lib/queries/workouts";
import { getLatestBodyweight } from "@/lib/queries/bodyweight";
import { duration, friendlyDate, kg, km } from "@/lib/format";
import { formatIST } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const friend = await getOtherUser(user.id);

  const [data, records, days, latestWeight, friendSummary] = await Promise.all([
    getDashboardData(user.id, user.weeklyGoal),
    getPersonalRecords(user.id),
    getWorkoutDays(),
    getLatestBodyweight(user.id),
    friend
      ? getFriendSummary(friend.id, friend.name, friend.weeklyGoal)
      : Promise.resolve(null),
  ]);

  const pickerDays = days.map((d) => ({
    id: d.id,
    name: d.name,
    exerciseCount: d._count.exercises,
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {formatIST(new Date(), "EEEE, d MMM")} · Hi {user.name}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {data.todayDone ? "Nice work today 💪" : "Ready to train?"}
        </h1>
      </header>

      <StartWorkoutButton days={pickerDays} className="w-full" />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Flame}
          label="Streak"
          value={data.streak > 0 ? `${data.streak} day${data.streak === 1 ? "" : "s"}` : "—"}
          hint={`${data.weekCount}/${user.weeklyGoal} this week`}
          accent={data.streak > 0}
        />
        <StatCard
          icon={CheckCircle2}
          label="Today"
          value={data.todayDone ? "Done" : "Rest"}
          hint={data.todayDone ? "Workout logged" : "No workout yet"}
          accent={data.todayDone}
        />
        <StatCard
          icon={CalendarDays}
          label="This month"
          value={`${data.monthCount}`}
          hint={data.monthCount === 1 ? "workout" : "workouts"}
        />
        <StatCard
          icon={Timer}
          label="Last workout"
          value={data.lastWorkout ? friendlyDate(data.lastWorkout.date) : "—"}
          hint={data.lastWorkout?.dayName ?? "Get started"}
        />
      </div>

      <BodyweightCard latest={latestWeight} />

      {friendSummary && <FriendSection friend={friendSummary} />}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="size-5 text-primary" /> Personal Records
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <RecordCard
            icon={Dumbbell}
            label="Heaviest lift"
            value={records.heaviest ? kg(records.heaviest.weight) : "—"}
            sub={
              records.heaviest
                ? `${records.heaviest.exercise} × ${records.heaviest.reps}`
                : "No lifts yet"
            }
          />
          <RecordCard
            icon={Repeat}
            label="Most reps"
            value={records.mostReps ? `${records.mostReps.reps}` : "—"}
            sub={
              records.mostReps
                ? `${records.mostReps.exercise} @ ${kg(records.mostReps.weight)}`
                : "No reps yet"
            }
          />
          <RecordCard
            icon={Timer}
            label="Longest cardio"
            value={records.longestCardio ? duration(records.longestCardio.minutes) : "—"}
            sub={records.longestCardio?.exercise ?? "No cardio yet"}
          />
          <RecordCard
            icon={MapPin}
            label="Longest distance"
            value={records.longestDistance ? km(records.longestDistance.km) : "—"}
            sub={records.longestDistance?.exercise ?? "No cardio yet"}
          />
        </div>
      </section>

      {data.progression.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="size-5 text-primary" /> Weight Progress
          </h2>
          <Card className="divide-y divide-border p-0">
            {data.progression.map((p) => (
              <div key={p.exerciseName} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{p.exerciseName}</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{kg(p.from)}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                  <span className="font-semibold text-primary">{kg(p.to)}</span>
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent</h2>
          <Link href="/history" className="text-sm text-primary">
            View all
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No workouts yet. Tap “Start Workout” to begin.
          </Card>
        ) : (
          <Card className="divide-y divide-border p-0">
            {data.recent.map((s) => (
              <Link
                key={s.id}
                href={`/history/${s.id}`}
                className="flex items-center justify-between px-4 py-3 active:bg-accent"
              >
                <div>
                  <div className="font-medium">{s.dayName}</div>
                  <div className="text-xs text-muted-foreground">
                    {friendlyDate(s.date)}
                    {s.exerciseCount > 0 && ` · ${s.exerciseCount} exercises`}
                    {s.cardioCount > 0 && ` · ${s.cardioCount} cardio`}
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

function RecordCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Dumbbell;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="gap-0 p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}
