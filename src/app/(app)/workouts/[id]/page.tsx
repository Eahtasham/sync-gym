import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ExerciseManager } from "@/components/workouts/exercise-manager";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { getWorkoutDay } from "@/lib/queries/workouts";
import type { ExerciseType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WorkoutDayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const day = await getWorkoutDay(id);
  if (!day) notFound();

  return (
    <div>
      <PageHeader
        title={day.name}
        subtitle={`${day.exercises.length} exercise${day.exercises.length === 1 ? "" : "s"}`}
        backHref="/workouts"
      />

      {day.exercises.length > 0 && (
        <StartWorkoutButton
          days={[{ id: day.id, name: day.name, exerciseCount: day.exercises.length }]}
          className="mb-4 w-full"
        />
      )}

      <ExerciseManager
        dayId={day.id}
        initial={day.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          type: e.type as ExerciseType,
          isFavorite: e.isFavorite,
        }))}
      />
    </div>
  );
}
