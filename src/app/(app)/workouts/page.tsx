import { PageHeader } from "@/components/page-header";
import { WorkoutDaysList } from "@/components/workouts/workout-days-list";
import { getWorkoutDays } from "@/lib/queries/workouts";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const days = await getWorkoutDays();

  return (
    <div>
      <PageHeader
        title="Workouts"
        subtitle="Your workout day templates"
      />
      <WorkoutDaysList
        initialDays={days.map((d) => ({
          id: d.id,
          name: d.name,
          exerciseCount: d._count.exercises,
        }))}
      />
    </div>
  );
}
