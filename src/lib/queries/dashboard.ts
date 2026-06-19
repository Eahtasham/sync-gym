import {
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { db } from "@/lib/db";
import { computeStreak } from "@/lib/streak";

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

const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });

export async function getDashboardData(
  userId: string,
  weeklyGoal: number,
): Promise<DashboardData> {
  const now = new Date();

  const [todayCount, last, monthCount, weekCount, totalSessions, recentRaw, streakDates, progression] =
    await Promise.all([
      db.workoutSession.count({
        where: { userId, sessionDate: { gte: startOfDay(now), lte: endOfDay(now) } },
      }),
      db.workoutSession.findFirst({
        where: { userId },
        orderBy: { sessionDate: "desc" },
        include: { workoutDay: { select: { name: true } } },
      }),
      db.workoutSession.count({
        where: { userId, sessionDate: { gte: startOfMonth(now), lte: endOfMonth(now) } },
      }),
      db.workoutSession.count({
        where: { userId, sessionDate: { gte: weekStart(now) } },
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
      db.workoutSession.findMany({
        where: { userId, sessionDate: { gte: subDays(now, 60) } },
        select: { sessionDate: true },
      }),
      topMovers(userId),
    ]);

  return {
    todayDone: todayCount > 0,
    lastWorkout: last
      ? { date: last.sessionDate, dayName: last.workoutDay.name }
      : null,
    monthCount,
    weekCount,
    totalSessions,
    streak: computeStreak(streakDates.map((s) => s.sessionDate), weeklyGoal),
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
  const [weekCount, monthCount, last, streakDates, bw, heaviestSet] =
    await Promise.all([
      db.workoutSession.count({
        where: { userId: friendId, sessionDate: { gte: weekStart(now) } },
      }),
      db.workoutSession.count({
        where: { userId: friendId, sessionDate: { gte: startOfMonth(now), lte: endOfMonth(now) } },
      }),
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

  return {
    name: friendName,
    streak: computeStreak(streakDates.map((s) => s.sessionDate), friendWeeklyGoal),
    weekCount,
    monthCount,
    lastWorkout: last?.sessionDate ?? null,
    bodyweightKg: bw?.weightKg ?? null,
    heaviest: heaviestSet
      ? { exercise: heaviestSet.exerciseLog.exercise.name, weight: heaviestSet.weight }
      : null,
  };
}
