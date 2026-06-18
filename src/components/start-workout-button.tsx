"use client";

import { useState, useTransition } from "react";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { startSession } from "@/lib/actions/sessions";
import { cn } from "@/lib/utils";

type Day = { id: string; name: string; exerciseCount?: number };

export function StartWorkoutButton({
  days,
  className,
  label = "Start Workout",
  size = "lg",
}: {
  days: Day[];
  className?: string;
  label?: string;
  size?: "lg" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function start(id: string) {
    setPendingId(id);
    startTransition(() => startSession(id)); // redirects to /session/[id]
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size={size} className={cn("gap-2", className)}>
            <Play className="size-5 fill-current" />
            {label}
          </Button>
        }
      />
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Choose a workout</SheetTitle>
        </SheetHeader>
        <div className="grid gap-2 overflow-y-auto px-4 pb-8">
          {days.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No workout days yet. Create one in the Workouts tab.
            </p>
          )}
          {days.map((day) => (
            <button
              key={day.id}
              type="button"
              disabled={pendingId !== null}
              onClick={() => start(day.id)}
              className={cn(
                "flex items-center justify-between rounded-xl border border-border bg-card px-4 py-4 text-left",
                "active:scale-[0.99] transition-transform disabled:opacity-60",
              )}
            >
              <div>
                <div className="font-semibold">{day.name}</div>
                {day.exerciseCount !== undefined && (
                  <div className="text-xs text-muted-foreground">
                    {day.exerciseCount} exercise{day.exerciseCount === 1 ? "" : "s"}
                  </div>
                )}
              </div>
              {pendingId === day.id ? (
                <Loader2 className="size-5 animate-spin text-primary" />
              ) : (
                <Play className="size-5 fill-primary text-primary" />
              )}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
