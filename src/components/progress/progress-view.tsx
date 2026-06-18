"use client";

import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; name: string };
type StrengthPoint = { label: string; topWeight: number; volume: number };
type CardioPoint = { label: string; durationMinutes: number; distanceKm: number | null };

export function ProgressView({
  exercises,
  type,
  selectedId,
  strengthData,
  cardioData,
}: {
  exercises: { strength: Option[]; cardio: Option[] };
  type: "strength" | "cardio";
  selectedId: string | null;
  strengthData?: StrengthPoint[];
  cardioData?: CardioPoint[];
}) {
  const router = useRouter();
  const list = type === "strength" ? exercises.strength : exercises.cardio;

  function switchType(next: string | null) {
    if (!next) return;
    const t = next as "strength" | "cardio";
    const first = (t === "strength" ? exercises.strength : exercises.cardio)[0]?.id;
    router.push(`/progress?type=${t}${first ? `&ex=${first}` : ""}`);
  }
  function switchExercise(id: string | null) {
    if (!id) return;
    router.push(`/progress?type=${type}&ex=${id}`);
  }

  const hasAny = exercises.strength.length > 0 || exercises.cardio.length > 0;

  return (
    <div className="space-y-4">
      <Tabs value={type} onValueChange={switchType}>
        <TabsList className="w-full">
          <TabsTrigger value="strength" className="flex-1">
            Strength
          </TabsTrigger>
          <TabsTrigger value="cardio" className="flex-1">
            Cardio
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {!hasAny ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No data yet. Log a few workouts to see your progress.
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No {type} data yet.
        </Card>
      ) : (
        <>
          <Select
            value={selectedId ?? undefined}
            items={Object.fromEntries(list.map((e) => [e.id, e.name]))}
            onValueChange={switchExercise}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select exercise" />
            </SelectTrigger>
            <SelectContent>
              {list.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {type === "strength" && strengthData && (
            <>
              <ChartCard
                title="Top set weight (kg)"
                data={strengthData}
                dataKey="topWeight"
                color="var(--chart-1)"
                unit=" kg"
                empty={strengthData.length === 0}
              />
              <ChartCard
                title="Total volume (kg)"
                data={strengthData}
                dataKey="volume"
                color="var(--chart-3)"
                unit=" kg"
                empty={strengthData.length === 0}
              />
            </>
          )}

          {type === "cardio" && cardioData && (
            <>
              <ChartCard
                title="Duration (min)"
                data={cardioData}
                dataKey="durationMinutes"
                color="var(--chart-2)"
                unit=" min"
                empty={cardioData.length === 0}
              />
              <ChartCard
                title="Distance (km)"
                data={cardioData}
                dataKey="distanceKm"
                color="var(--chart-5)"
                unit=" km"
                empty={cardioData.length === 0}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function ChartCard({
  title,
  data,
  dataKey,
  color,
  unit,
  empty,
}: {
  title: string;
  data: Record<string, unknown>[];
  dataKey: string;
  color: string;
  unit: string;
  empty: boolean;
}) {
  return (
    <Card className="gap-3 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {empty ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
      ) : (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(value) => [`${value}${unit}`, ""]}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: color }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
