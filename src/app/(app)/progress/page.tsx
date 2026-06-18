import { PageHeader } from "@/components/page-header";
import { ProgressView } from "@/components/progress/progress-view";
import {
  getCardioSeries,
  getProgressExercises,
  getStrengthSeries,
} from "@/lib/queries/progress";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; ex?: string }>;
}) {
  const sp = await searchParams;
  const exercises = await getProgressExercises();

  const type: "strength" | "cardio" =
    sp.type === "cardio" ? "cardio" : "strength";
  const list = type === "strength" ? exercises.strength : exercises.cardio;
  const selectedId = sp.ex && list.some((e) => e.id === sp.ex) ? sp.ex : list[0]?.id ?? null;

  let strengthData;
  let cardioData;
  if (selectedId && type === "strength") {
    const { points } = await getStrengthSeries(selectedId);
    strengthData = points.map((p) => ({
      label: shortDate(p.date),
      topWeight: p.topWeight,
      volume: p.volume,
    }));
  } else if (selectedId && type === "cardio") {
    const { points } = await getCardioSeries(selectedId);
    cardioData = points.map((p) => ({
      label: shortDate(p.date),
      durationMinutes: Math.round(p.durationMinutes),
      distanceKm: p.distanceKm,
    }));
  }

  return (
    <div>
      <PageHeader title="Progress" subtitle="Strength & cardio trends" />
      <ProgressView
        exercises={exercises}
        type={type}
        selectedId={selectedId}
        strengthData={strengthData}
        cardioData={cardioData}
      />
    </div>
  );
}
