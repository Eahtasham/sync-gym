import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { computeStreak, distinctDayCount } from "@/lib/streak";
import {
  istEndOfMonth,
  istStartOfMonth,
  istStartOfToday,
  istStartOfWeek,
} from "@/lib/tz";

export type DashboardData = {
  todayDone: boolean;
  lastWorkout: { date: Date; dayName: string } | null;
  monthCount: number;
  weekCount: number;
  totalSessions: number;
  streak: number;
  recent: {
    id: string;
    date: Date;
    dayName: string;
    exerciseCount: number;
    cardioCount: number;
  }[];
  progression: { exerciseName: string; from: number; to: number }[];
};

export async function getDashboardData(
  userId: string,
  weeklyGoal: number,
): Promise<DashboardData> {
  const now = new Date();

  const [last, totalSessions, recentRaw, recentDateRows, progression] =
    await Promise.all([
      db.workoutSession.findFirst({
        where: { userId },
        orderBy: { sessionDate: "desc" },
        include: { workoutDay: { select: { name: true } } },
      }),
      db.workoutSession.count({ where: { userId } }),
      db.workoutSession.findMany({
        where: { userId },
        orderBy: { sessionDate: "desc" },
        take: 5,
        include: {
          workoutDay: { select: { name: true } },
          _count: { select: { exerciseLogs: true, cardioLogs: true } },
        },
      }),
      // One pull of recent dates -> streak + distinct-day week/month/today counts.
      db.workoutSession.findMany({
        where: { userId, sessionDate: { gte: subDays(now, 60) } },
        select: { sessionDate: true },
      }),
      topMovers(userId),
    ]);

  const dates = recentDateRows.map((s) => s.sessionDate);

  return {
    todayDone: distinctDayCount(dates, istStartOfToday(now)) > 0,
    lastWorkout: last
      ? { date: last.sessionDate, dayName: last.workoutDay.name }
      : null,
    monthCount: distinctDayCount(dates, istStartOfMonth(now), istEndOfMonth(now)),
    weekCount: distinctDayCount(dates, istStartOfWeek(now)),
    totalSessions,
    streak: computeStreak(dates, weeklyGoal),
    recent: recentRaw.map((s) => ({
      id: s.id,
      date: s.sessionDate,
      dayName: s.workoutDay.name,
      exerciseCount: s._count.exerciseLogs,
      cardioCount: s._count.cardioLogs,
    })),
    progression,
  };
}

/** Top 3 strength exercises by weight gain for a user. */
async function topMovers(userId: string) {
  const logs = await db.exerciseLog.findMany({
    where: { workoutSession: { userId }, sets: { some: { weight: { gt: 0 } } } },
    orderBy: { workoutSession: { sessionDate: "asc" } },
    include: {
      exercise: { select: { name: true } },
      sets: { select: { weight: true } },
    },
  });

  const byExercise = new Map<string, { name: string; first: number; last: number }>();
  for (const log of logs) {
    const top = Math.max(...log.sets.map((s) => s.weight), 0);
    if (top <= 0) continue;
    const key = log.exercise.name;
    const existing = byExercise.get(key);
    if (!existing) byExercise.set(key, { name: key, first: top, last: top });
    else existing.last = top;
  }

  return [...byExercise.values()]
    .filter((e) => e.last > e.first)
    .sort((a, b) => b.last - b.first - (a.last - a.first))
    .slice(0, 3)
    .map((e) => ({ exerciseName: e.name, from: e.first, to: e.last }));
}

export type FriendSummary = {
  name: string;
  streak: number;
  weekCount: number;
  monthCount: number;
  lastWorkout: Date | null;
  bodyweightKg: number | null;
  heaviest: { exercise: string; weight: number } | null;
};

/** Compact read-only snapshot of the other user for the dashboard. */
export async function getFriendSummary(
  friendId: string,
  friendName: string,
  friendWeeklyGoal: number,
): Promise<FriendSummary> {
  const now = new Date();
  const [last, dateRows, bw, heaviestSet] = await Promise.all([
    db.workoutSession.findFirst({
      where: { userId: friendId },
      orderBy: { sessionDate: "desc" },
      select: { sessionDate: true },
    }),
    db.workoutSession.findMany({
      where: { userId: friendId, sessionDate: { gte: subDays(now, 60) } },
      select: { sessionDate: true },
    }),
    db.bodyweightLog.findFirst({
      where: { userId: friendId },
      orderBy: { loggedAt: "desc" },
      select: { weightKg: true },
    }),
    db.exerciseSet.findFirst({
      where: {
        weight: { gt: 0 },
        exerciseLog: { workoutSession: { userId: friendId } },
      },
      orderBy: [{ weight: "desc" }, { reps: "desc" }],
      include: { exerciseLog: { include: { exercise: { select: { name: true } } } } },
    }),
  ]);

  const dates = dateRows.map((s) => s.sessionDate);

  return {
    name: friendName,
    streak: computeStreak(dates, friendWeeklyGoal),
    weekCount: distinctDayCount(dates, istStartOfWeek(now)),
    monthCount: distinctDayCount(dates, istStartOfMonth(now), istEndOfMonth(now)),
    lastWorkout: last?.sessionDate ?? null,
    bodyweightKg: bw?.weightKg ?? null,
    heaviest: heaviestSet
      ? { exercise: heaviestSet.exerciseLog.exercise.name, weight: heaviestSet.weight }
      : null,
  };
}
