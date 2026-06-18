"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Dumbbell,
  HeartPulse,
  Loader2,
  Plus,
  Search,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { avgSpeed, friendlyDate, setsSummary } from "@/lib/format";
import {
  addExercisesToSession,
  finishSession,
  removeCardioLog,
  removeExerciseLog,
  saveSession,
  type SaveSessionPayload,
} from "@/lib/actions/sessions";
import type { SessionForEdit } from "@/lib/queries/session";

type LibraryExercise = { id: string; name: string; type: string };

type SetRow = { weight: string; reps: string };
type StrengthState = {
  logId: string;
  name: string;
  notes: string;
  showNotes: boolean;
  sets: SetRow[];
  previous: SessionForEdit["strength"][number]["previous"];
};
type CardioState = {
  logId: string;
  name: string;
  durationMinutes: string;
  distanceKm: string;
  calories: string;
  notes: string;
  showNotes: boolean;
  previous: SessionForEdit["cardio"][number]["previous"];
};

const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export function SessionEditor({
  session,
  library,
}: {
  session: SessionForEdit;
  library: LibraryExercise[];
}) {
  const router = useRouter();
  const [strength, setStrength] = useState<StrengthState[]>(
    session.strength.map((e) => ({
      logId: e.logId,
      name: e.name,
      notes: e.notes ?? "",
      showNotes: !!e.notes,
      sets: e.sets.map((s) => ({
        weight: s.weight ? String(s.weight) : "",
        reps: s.reps ? String(s.reps) : "",
      })),
      previous: e.previous,
    })),
  );
  const [cardio, setCardio] = useState<CardioState[]>(
    session.cardio.map((c) => ({
      logId: c.logId,
      name: c.name,
      durationMinutes: c.durationMinutes ? String(c.durationMinutes) : "",
      distanceKm: c.distanceKm != null ? String(c.distanceKm) : "",
      calories: c.calories != null ? String(c.calories) : "",
      notes: c.notes ?? "",
      showNotes: !!c.notes,
      previous: c.previous,
    })),
  );
  const [sessionNotes, setSessionNotes] = useState(session.notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [finishing, startFinish] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  const buildPayload = useCallback(
    (): SaveSessionPayload => ({
      notes: sessionNotes,
      logs: strength.map((e) => ({
        exerciseLogId: e.logId,
        notes: e.notes || null,
        sets: e.sets.map((s) => ({ weight: num(s.weight), reps: num(s.reps) })),
      })),
      cardio: cardio.map((c) => ({
        cardioLogId: c.logId,
        durationMinutes: num(c.durationMinutes),
        distanceKm: c.distanceKm ? num(c.distanceKm) : null,
        calories: c.calories ? Math.round(num(c.calories)) : null,
        notes: c.notes || null,
      })),
    }),
    [strength, cardio, sessionNotes],
  );

  // Debounced autosave
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await saveSession(session.id, buildPayload());
        setStatus("saved");
      } catch {
        setStatus("idle");
      }
    }, 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [strength, cardio, sessionNotes, session.id, buildPayload]);

  function finish() {
    if (timer.current) clearTimeout(timer.current);
    startFinish(() => finishSession(session.id, buildPayload()));
  }

  // ---- add / remove exercises mid-session ----
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, startBusy] = useTransition();

  const presentNames = useMemo(
    () =>
      new Set([
        ...session.strength.map((s) => s.name),
        ...session.cardio.map((c) => c.name),
      ]),
    [session],
  );

  const pickable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return library.filter(
      (e) =>
        !presentNames.has(e.name) &&
        (!q || e.name.toLowerCase().includes(q)),
    );
  }, [library, presentNames, search]);

  /** Save current edits, run a mutation, then refresh (editor remounts via key). */
  function persistThen(fn: () => Promise<unknown>) {
    if (timer.current) clearTimeout(timer.current);
    startBusy(async () => {
      await saveSession(session.id, buildPayload());
      await fn();
      router.refresh();
    });
  }

  function addExercise(id: string) {
    setPickerOpen(false);
    setSearch("");
    persistThen(() => addExercisesToSession(session.id, [id]));
  }

  // ---- strength mutations ----
  const updateSet = (li: number, si: number, field: keyof SetRow, val: string) =>
    setStrength((st) =>
      st.map((e, i) =>
        i === li
          ? { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, [field]: val } : s)) }
          : e,
      ),
    );
  const addSet = (li: number) =>
    setStrength((st) =>
      st.map((e, i) => {
        if (i !== li) return e;
        const last = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, { weight: last?.weight ?? "", reps: last?.reps ?? "" }] };
      }),
    );
  const removeSet = (li: number, si: number) =>
    setStrength((st) =>
      st.map((e, i) => (i === li ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e)),
    );
  const copyPrevious = (li: number) =>
    setStrength((st) =>
      st.map((e, i) => {
        if (i !== li || !e.previous) return e;
        return {
          ...e,
          sets: e.previous.sets.map((s) => ({
            weight: s.weight ? String(s.weight) : "",
            reps: s.reps ? String(s.reps) : "",
          })),
        };
      }),
    );
  const toggleStrengthNotes = (li: number) =>
    setStrength((st) => st.map((e, i) => (i === li ? { ...e, showNotes: !e.showNotes } : e)));
  const setStrengthNotes = (li: number, val: string) =>
    setStrength((st) => st.map((e, i) => (i === li ? { ...e, notes: val } : e)));

  // ---- cardio mutations ----
  const updateCardio = (ci: number, field: keyof CardioState, val: string) =>
    setCardio((c) => c.map((x, i) => (i === ci ? { ...x, [field]: val } : x)));
  const copyPrevCardio = (ci: number) =>
    setCardio((c) =>
      c.map((x, i) => {
        if (i !== ci || !x.previous) return x;
        return {
          ...x,
          durationMinutes: x.previous.durationMinutes ? String(x.previous.durationMinutes) : "",
          distanceKm: x.previous.distanceKm != null ? String(x.previous.distanceKm) : "",
        };
      }),
    );
  const toggleCardioNotes = (ci: number) =>
    setCardio((c) => c.map((x, i) => (i === ci ? { ...x, showNotes: !x.showNotes } : x)));

  return (
    <div className="space-y-4 pb-28">
      {/* status pill */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{friendlyDate(session.sessionDate)}</p>
        <SaveStatus status={status} />
      </div>

      {strength.map((e, li) => (
        <Card key={e.logId} className="gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{e.name}</h3>
              <p className="text-xs text-muted-foreground">
                Previous:{" "}
                {e.previous ? setsSummary(e.previous.sets) : "—"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleStrengthNotes(li)}
                className={cn(
                  "rounded-md p-1.5 text-muted-foreground hover:bg-accent",
                  e.showNotes && "text-primary",
                )}
                aria-label="Toggle notes"
              >
                <StickyNote className="size-4" />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => persistThen(() => removeExerciseLog(e.logId))}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-40"
                aria-label="Remove exercise"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          {/* column labels */}
          <div className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 px-1 text-[11px] font-medium uppercase text-muted-foreground">
            <span>Set</span>
            <span>Weight (kg)</span>
            <span>Reps</span>
            <span />
          </div>

          {e.sets.map((s, si) => (
            <div
              key={si}
              className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2"
            >
              <span className="text-center text-sm font-semibold text-muted-foreground">
                {si + 1}
              </span>
              <Input
                inputMode="decimal"
                value={s.weight}
                onChange={(ev) => updateSet(li, si, "weight", ev.target.value)}
                placeholder="0"
                className="h-11 text-center text-base"
              />
              <Input
                inputMode="numeric"
                value={s.reps}
                onChange={(ev) => updateSet(li, si, "reps", ev.target.value)}
                placeholder="0"
                className="h-11 text-center text-base"
              />
              <button
                type="button"
                onClick={() => removeSet(li, si)}
                disabled={e.sets.length === 1}
                className="flex justify-center text-muted-foreground disabled:opacity-20"
                aria-label="Remove set"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => addSet(li)}
            >
              <Plus className="size-4" /> Add set
            </Button>
            {e.previous && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => copyPrevious(li)}
              >
                <Copy className="size-4" /> Copy previous
              </Button>
            )}
          </div>

          {e.showNotes && (
            <Textarea
              value={e.notes}
              onChange={(ev) => setStrengthNotes(li, ev.target.value)}
              placeholder="Notes for this exercise…"
              rows={2}
            />
          )}
        </Card>
      ))}

      {cardio.map((c, ci) => {
        const speed = c.distanceKm && c.durationMinutes
          ? avgSpeed(num(c.distanceKm), num(c.durationMinutes))
          : null;
        return (
          <Card key={c.logId} className="gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 font-semibold">
                  {c.name}
                  <Badge variant="secondary" className="text-chart-2">Cardio</Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Previous:{" "}
                  {c.previous
                    ? `${Math.round(c.previous.durationMinutes)} min${
                        c.previous.distanceKm ? ` · ${c.previous.distanceKm} km` : ""
                      }`
                    : "—"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleCardioNotes(ci)}
                  className={cn(
                    "rounded-md p-1.5 text-muted-foreground hover:bg-accent",
                    c.showNotes && "text-primary",
                  )}
                  aria-label="Toggle notes"
                >
                  <StickyNote className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => persistThen(() => removeCardioLog(c.logId))}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-40"
                  aria-label="Remove exercise"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Duration (min)">
                <Input
                  inputMode="decimal"
                  value={c.durationMinutes}
                  onChange={(ev) => updateCardio(ci, "durationMinutes", ev.target.value)}
                  placeholder="0"
                  className="h-11 text-base"
                />
              </Field>
              <Field label="Distance (km)">
                <Input
                  inputMode="decimal"
                  value={c.distanceKm}
                  onChange={(ev) => updateCardio(ci, "distanceKm", ev.target.value)}
                  placeholder="0"
                  className="h-11 text-base"
                />
              </Field>
              <Field label="Calories">
                <Input
                  inputMode="numeric"
                  value={c.calories}
                  onChange={(ev) => updateCardio(ci, "calories", ev.target.value)}
                  placeholder="optional"
                  className="h-11 text-base"
                />
              </Field>
              <Field label="Avg speed">
                <div className="flex h-11 items-center rounded-md border border-input bg-muted/40 px-3 text-base text-muted-foreground">
                  {speed != null ? `${speed} km/h` : "—"}
                </div>
              </Field>
            </div>

            <div className="flex gap-2">
              {c.previous && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => copyPrevCardio(ci)}
                >
                  <Copy className="size-4" /> Copy previous
                </Button>
              )}
            </div>

            {c.showNotes && (
              <Textarea
                value={c.notes}
                onChange={(ev) => updateCardio(ci, "notes", ev.target.value)}
                placeholder="Notes…"
                rows={2}
              />
            )}
          </Card>
        );
      })}

      {/* Add exercise (mix in any body part or cardio for today) */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetTrigger
          render={
            <Button variant="secondary" className="w-full gap-2" disabled={busy}>
              {busy ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
              Add exercise
            </Button>
          }
        />
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Add an exercise</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises"
                className="pl-9"
                inputMode="search"
              />
            </div>
          </div>
          <div className="grid min-h-0 flex-1 gap-1.5 overflow-y-auto px-4 pb-8">
            {pickable.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search ? "No matches." : "All exercises are already added."}
              </p>
            )}
            {pickable.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => addExercise(ex.id)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left active:scale-[0.99] transition-transform"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    ex.type === "CARDIO"
                      ? "bg-chart-2/15 text-chart-2"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  {ex.type === "CARDIO" ? (
                    <HeartPulse className="size-5" />
                  ) : (
                    <Dumbbell className="size-5" />
                  )}
                </span>
                <span className="flex-1 font-medium">{ex.name}</span>
                <Plus className="size-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {strength.length === 0 && cardio.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No exercises yet. Tap “Add exercise” to build today’s workout.
        </Card>
      )}

      {/* session notes */}
      <Textarea
        value={sessionNotes}
        onChange={(e) => setSessionNotes(e.target.value)}
        placeholder="Overall session notes…"
        rows={2}
      />

      {/* sticky finish bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur safe-bottom">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <SaveStatus status={status} className="flex-1" />
          <Button onClick={finish} disabled={finishing} className="gap-2" size="lg">
            {finishing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Check className="size-5" />
            )}
            Finish
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-medium uppercase text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function SaveStatus({
  status,
  className,
}: {
  status: "idle" | "saving" | "saved";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="size-3.5 animate-spin" /> Saving…
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="size-3.5 text-primary" /> Saved
        </>
      )}
    </span>
  );
}
