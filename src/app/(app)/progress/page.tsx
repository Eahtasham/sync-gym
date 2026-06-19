import { PageHeader } from "@/components/page-header";
import { ProgressView } from "@/components/progress/progress-view";
import {
  getCardioSeries,
  getProgressExercises,
  getStrengthSeries,
} from "@/lib/queries/progress";
import { getBodyweightSeries } from "@/lib/queries/bodyweight";
import { requireUser } from "@/lib/auth";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; ex?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const exercises = await getProgressExercises(user.id);

  const type: "strength" | "cardio" | "bodyweight" =
    sp.type === "cardio" ? "cardio" : sp.type === "bodyweight" ? "bodyweight" : "strength";

  const list = type === "strength" ? exercises.strength : exercises.cardio;
  const selectedId =
    sp.ex && list.some((e) => e.id === sp.ex) ? sp.ex : list[0]?.id ?? null;

  let strengthData;
  let cardioData;
  let bodyweightData;
  if (type === "bodyweight") {
    const points = await getBodyweightSeries(user.id);
    bodyweightData = points.map((p) => ({ label: shortDate(p.date), weightKg: p.weightKg }));
  } else if (selectedId && type === "strength") {
    const { points } = await getStrengthSeries(user.id, selectedId);
    strengthData = points.map((p) => ({
      label: shortDate(p.date),
      topWeight: p.topWeight,
      volume: p.volume,
    }));
  } else if (selectedId && type === "cardio") {
    const { points } = await getCardioSeries(user.id, selectedId);
    cardioData = points.map((p) => ({
      label: shortDate(p.date),
      durationMinutes: Math.round(p.durationMinutes),
      distanceKm: p.distanceKm,
    }));
  }

  return (
    <div>
      <PageHeader title="Progress" subtitle="Strength, cardio & bodyweight" />
      <ProgressView
        exercises={exercises}
        type={type}
        selectedId={selectedId}
        strengthData={strengthData}
        cardioData={cardioData}
        bodyweightData={bodyweightData}
      />
    </div>
  );
}
