import { endOfDay, startOfDay } from "date-fns";
import { db } from "@/lib/db";

export type HistoryFilters = {
  dayId?: string;
  exerciseId?: string;
  from?: string; // yyyy-mm-dd
  to?: string;
};

export async function getHistoryFilterOptions() {
  const [days, exercises] = await Promise.all([
    db.workoutDay.findMany({
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    }),
    db.exercise.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  // Deduplicate exercises by name for the filter dropdown.
  const seen = new Set<string>();
  const uniqueExercises = exercises.filter((e) => {
    if (seen.has(e.name)) return false;
    seen.add(e.name);
    return true;
  });
  return { days, exercises: uniqueExercises };
}

export async function getHistory(userId: string, filters: HistoryFilters) {
  const { dayId, exerciseId, from, to } = filters;

  const dateFilter =
    from || to
      ? {
          sessionDate: {
            ...(from ? { gte: startOfDay(new Date(from)) } : {}),
            ...(to ? { lte: endOfDay(new Date(to)) } : {}),
          },
        }
      : {};

  // exerciseId from the filter is one representative id; match by name.
  let exerciseName: string | undefined;
  if (exerciseId) {
    const ex = await db.exercise.findUnique({
      where: { id: exerciseId },
      select: { name: true },
    });
    exerciseName = ex?.name;
  }

  const sessions = await db.workoutSession.findMany({
    where: {
      userId,
      ...(dayId ? { workoutDayId: dayId } : {}),
      ...dateFilter,
      ...(exerciseName
        ? {
            OR: [
              { exerciseLogs: { some: { exercise: { name: exerciseName } } } },
              { cardioLogs: { some: { exercise: { name: exerciseName } } } },
            ],
          }
        : {}),
    },
    orderBy: { sessionDate: "desc" },
    include: {
      workoutDay: { select: { name: true } },
      _count: { select: { exerciseLogs: true, cardioLogs: true } },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    date: s.sessionDate,
    dayName: s.workoutDay.name,
    exerciseCount: s._count.exerciseLogs,
    cardioCount: s._count.cardioLogs,
  }));
}

export async function getSessionDetail(id: string, userId: string) {
  return db.workoutSession.findFirst({
    where: { id, userId },
    include: {
      workoutDay: { select: { id: true, name: true } },
      exerciseLogs: {
        orderBy: { exercise: { displayOrder: "asc" } },
        include: {
          exercise: { select: { name: true } },
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
      cardioLogs: {
        orderBy: { exercise: { displayOrder: "asc" } },
        include: { exercise: { select: { name: true } } },
      },
    },
  });
}

export type SessionDetail = NonNullable<
  Awaited<ReturnType<typeof getSessionDetail>>
>;
