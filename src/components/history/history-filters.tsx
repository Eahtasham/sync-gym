"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Option = { id: string; name: string };

export function HistoryFilters({
  days,
  exercises,
}: {
  days: Option[];
  exercises: Option[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const dayId = params.get("dayId") ?? "all";
  const exerciseId = params.get("exerciseId") ?? "all";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`/history?${next.toString()}`);
  }

  const hasFilters = dayId !== "all" || exerciseId !== "all" || from || to;

  return (
    <div className="mb-4 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Select value={dayId} onValueChange={(v) => setParam("dayId", v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Workout" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All workouts</SelectItem>
            {days.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={exerciseId} onValueChange={(v) => setParam("exerciseId", v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Exercise" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All exercises</SelectItem>
            {exercises.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => setParam("from", e.target.value)}
          className="h-10"
        />
        <Input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setParam("to", e.target.value)}
          className="h-10"
        />
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => router.push("/history")}
        >
          <X className="size-4" /> Clear filters
        </Button>
      )}
    </div>
  );
}
