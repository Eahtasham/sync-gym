import {
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { db } from "@/lib/db";

export type DashboardData = {
  todayDone: boolean;
  lastWorkout: { date: Date; dayName: string } | null;
  monthCount: number;
  totalSessions: number;
  recent: {
    id: string;
    date: Date;
    dayName: string;
    exerciseCount: number;
    cardioCount: number;
  }[];
  progression: { exerciseName: string; from: number; to: number }[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();

  const [todayCount, last, monthCount, totalSessions, recentRaw, progression] =
    await Promise.all([
      db.workoutSession.count({
        where: { sessionDate: { gte: startOfDay(now), lte: endOfDay(now) } },
      }),
      db.workoutSession.findFirst({
        orderBy: { sessionDate: "desc" },
        include: { workoutDay: { select: { name: true } } },
      }),
      db.workoutSession.count({
        where: {
          sessionDate: { gte: startOfMonth(now), lte: endOfMonth(now) },
        },
      }),
      db.workoutSession.count(),
      db.workoutSession.findMany({
        orderBy: { sessionDate: "desc" },
        take: 5,
        include: {
          workoutDay: { select: { name: true } },
          _count: { select: { exerciseLogs: true, cardioLogs: true } },
        },
      }),
      topMovers(),
    ]);

  return {
    todayDone: todayCount > 0,
    lastWorkout: last
      ? { date: last.sessionDate, dayName: last.workoutDay.name }
      : null,
    monthCount,
    totalSessions,
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

/** Top 3 strength exercises by weight gain (first logged top-set -> latest top-set). */
async function topMovers() {
  const logs = await db.exerciseLog.findMany({
    where: { sets: { some: { weight: { gt: 0 } } } },
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
    const existing = byExercise.get(log.exerciseId);
    if (!existing) {
      byExercise.set(log.exerciseId, {
        name: log.exercise.name,
        first: top,
        last: top,
      });
    } else {
      existing.last = top;
    }
  }

  return [...byExercise.values()]
    .filter((e) => e.last > e.first)
    .sort((a, b) => b.last - b.first - (a.last - a.first))
    .slice(0, 3)
    .map((e) => ({ exerciseName: e.name, from: e.first, to: e.last }));
}
