"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Dumbbell,
  ExternalLink,
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
import { avgSpeed, friendlyDate, kg } from "@/lib/format";
import {
  addExercisesToSession,
  finishSession,
  removeCardioLog,
  removeExerciseLog,
  saveCardioLog,
  saveExerciseLog,
  type SaveSessionPayload,
} from "@/lib/actions/sessions";
import type { SessionForEdit } from "@/lib/queries/session";

type LibraryExercise = { id: string; name: string; type: string };
type SetRow = { weight: string; reps: string };
type Status = "saved" | "dirty" | "saving";

type StrengthState = {
  logId: string;
  name: string;
  postureUrl: string | null;
  notes: string;
  showNotes: boolean;
  sets: SetRow[];
  previous: SessionForEdit["strength"][number]["previous"];
  lastBest: SessionForEdit["strength"][number]["lastBest"];
  status: Status;
};
type CardioState = {
  logId: string;
  name: string;
  postureUrl: string | null;
  durationMinutes: string;
  distanceKm: string;
  calories: string;
  notes: string;
  showNotes: boolean;
  previous: SessionForEdit["cardio"][number]["previous"];
  status: Status;
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
      postureUrl: e.postureUrl,
      notes: e.notes ?? "",
      showNotes: !!e.notes,
      sets: e.sets.map((s) => ({
        weight: s.weight ? String(s.weight) : "",
        reps: s.reps ? String(s.reps) : "",
      })),
      previous: e.previous,
      lastBest: e.lastBest,
      status: "saved",
    })),
  );
  const [cardio, setCardio] = useState<CardioState[]>(
    session.cardio.map((c) => ({
      logId: c.logId,
      name: c.name,
      postureUrl: c.postureUrl,
      durationMinutes: c.durationMinutes ? String(c.durationMinutes) : "",
      distanceKm: c.distanceKm != null ? String(c.distanceKm) : "",
      calories: c.calories != null ? String(c.calories) : "",
      notes: c.notes ?? "",
      showNotes: !!c.notes,
      previous: c.previous,
      status: "saved",
    })),
  );
  const [sessionNotes, setSessionNotes] = useState(session.notes ?? "");
  const [finishing, startFinish] = useTransition();
  const [busy, startBusy] = useTransition();

  function buildPayload(): SaveSessionPayload {
    return {
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
    };
  }

  function finish() {
    startFinish(() => finishSession(session.id, buildPayload()));
  }

  // ---- strength ----
  const markStrength = (li: number, status: Status) =>
    setStrength((st) => st.map((e, i) => (i === li ? { ...e, status } : e)));
  const updateSet = (li: number, si: number, field: keyof SetRow, val: string) =>
    setStrength((st) =>
      st.map((e, i) =>
        i === li
          ? {
              ...e,
              status: "dirty",
              sets: e.sets.map((s, j) => (j === si ? { ...s, [field]: val } : s)),
            }
          : e,
      ),
    );
  const addSet = (li: number) =>
    setStrength((st) =>
      st.map((e, i) => {
        if (i !== li) return e;
        const last = e.sets[e.sets.length - 1];
        return {
          ...e,
          status: "dirty",
          sets: [...e.sets, { weight: last?.weight ?? "", reps: last?.reps ?? "" }],
        };
      }),
    );
  const removeSet = (li: number, si: number) =>
    setStrength((st) =>
      st.map((e, i) =>
        i === li ? { ...e, status: "dirty", sets: e.sets.filter((_, j) => j !== si) } : e,
      ),
    );
  const copyPrevious = (li: number) =>
    setStrength((st) =>
      st.map((e, i) => {
        if (i !== li || !e.previous) return e;
        return {
          ...e,
          status: "dirty",
          sets: e.previous.sets.map((s) => ({
            weight: s.weight ? String(s.weight) : "",
            reps: s.reps ? String(s.reps) : "",
          })),
        };
      }),
    );
  const setStrengthNotes = (li: number, val: string) =>
    setStrength((st) => st.map((e, i) => (i === li ? { ...e, status: "dirty", notes: val } : e)));
  const toggleStrengthNotes = (li: number) =>
    setStrength((st) => st.map((e, i) => (i === li ? { ...e, showNotes: !e.showNotes } : e)));

  async function saveStrength(li: number) {
    const e = strength[li];
    markStrength(li, "saving");
    try {
      await saveExerciseLog(e.logId, {
        notes: e.notes || null,
        sets: e.sets.map((s) => ({ weight: num(s.weight), reps: num(s.reps) })),
      });
      markStrength(li, "saved");
      toast.success(`${e.name} saved`);
    } catch {
      markStrength(li, "dirty");
      toast.error("Couldn’t save — check your connection");
    }
  }

  // ---- cardio ----
  const updateCardio = (ci: number, field: keyof CardioState, val: string) =>
    setCardio((c) =>
      c.map((x, i) => (i === ci ? { ...x, status: "dirty", [field]: val } : x)),
    );
  const copyPrevCardio = (ci: number) =>
    setCardio((c) =>
      c.map((x, i) => {
        if (i !== ci || !x.previous) return x;
        return {
          ...x,
          status: "dirty",
          durationMinutes: x.previous.durationMinutes ? String(x.previous.durationMinutes) : "",
          distanceKm: x.previous.distanceKm != null ? String(x.previous.distanceKm) : "",
        };
      }),
    );
  const toggleCardioNotes = (ci: number) =>
    setCardio((c) => c.map((x, i) => (i === ci ? { ...x, showNotes: !x.showNotes } : x)));

  async function saveCardio(ci: number) {
    const c = cardio[ci];
    setCardio((arr) => arr.map((x, i) => (i === ci ? { ...x, status: "saving" } : x)));
    try {
      await saveCardioLog(c.logId, {
        durationMinutes: num(c.durationMinutes),
        distanceKm: c.distanceKm ? num(c.distanceKm) : null,
        calories: c.calories ? Math.round(num(c.calories)) : null,
        notes: c.notes || null,
      });
      setCardio((arr) => arr.map((x, i) => (i === ci ? { ...x, status: "saved" } : x)));
      toast.success(`${c.name} saved`);
    } catch {
      setCardio((arr) => arr.map((x, i) => (i === ci ? { ...x, status: "dirty" } : x)));
      toast.error("Couldn’t save — check your connection");
    }
  }

  // ---- add / remove ----
  const presentNames = useMemo(
    () => new Set([...session.strength.map((s) => s.name), ...session.cardio.map((c) => c.name)]),
    [session],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pickable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return library.filter(
      (e) => !presentNames.has(e.name) && (!q || e.name.toLowerCase().includes(q)),
    );
  }, [library, presentNames, search]);

  function addExercise(id: string) {
    setPickerOpen(false);
    setSearch("");
    startBusy(async () => {
      await addExercisesToSession(session.id, [id]);
      router.refresh();
    });
  }
  function removeStrength(logId: string) {
    startBusy(async () => {
      await removeExerciseLog(logId);
      router.refresh();
    });
  }
  function removeCardioEntry(logId: string) {
    startBusy(async () => {
      await removeCardioLog(logId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 pb-28">
      <p className="text-sm text-muted-foreground">{friendlyDate(session.sessionDate)}</p>

      {strength.map((e, li) => (
        <Card key={e.logId} className="gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 font-semibold">
                <span className="truncate">{e.name}</span>
                {e.postureUrl && <PostureLink url={e.postureUrl} />}
              </h3>
              <p className="text-xs text-muted-foreground">
                {e.lastBest
                  ? `Last best: ${kg(e.lastBest.weight)} × ${e.lastBest.reps}`
                  : "No previous data"}
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
                onClick={() => removeStrength(e.logId)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-40"
                aria-label="Remove exercise"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 px-1 text-[11px] font-medium uppercase text-muted-foreground">
            <span>Set</span>
            <span>Weight (kg)</span>
            <span>Reps</span>
            <span />
          </div>

          {e.sets.map((s, si) => (
            <div key={si} className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2">
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

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => addSet(li)}>
              <Plus className="size-4" /> Add set
            </Button>
            {e.previous && (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => copyPrevious(li)}>
                <Copy className="size-4" /> Copy previous
              </Button>
            )}
            <SaveButton status={e.status} onClick={() => saveStrength(li)} />
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
        const speed =
          c.distanceKm && c.durationMinutes
            ? avgSpeed(num(c.distanceKm), num(c.durationMinutes))
            : null;
        return (
          <Card key={c.logId} className="gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 font-semibold">
                  <span className="truncate">{c.name}</span>
                  <Badge variant="secondary" className="text-chart-2">Cardio</Badge>
                  {c.postureUrl && <PostureLink url={c.postureUrl} />}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {c.previous
                    ? `Last: ${Math.round(c.previous.durationMinutes)} min${
                        c.previous.distanceKm ? ` · ${c.previous.distanceKm} km` : ""
                      }`
                    : "No previous data"}
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
                  onClick={() => removeCardioEntry(c.logId)}
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

            <div className="flex flex-wrap gap-2">
              {c.previous && (
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => copyPrevCardio(ci)}>
                  <Copy className="size-4" /> Copy previous
                </Button>
              )}
              <SaveButton status={c.status} onClick={() => saveCardio(ci)} />
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
                    ex.type === "CARDIO" ? "bg-chart-2/15 text-chart-2" : "bg-primary/15 text-primary",
                  )}
                >
                  {ex.type === "CARDIO" ? <HeartPulse className="size-5" /> : <Dumbbell className="size-5" />}
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

      <Textarea
        value={sessionNotes}
        onChange={(e) => setSessionNotes(e.target.value)}
        placeholder="Overall session notes…"
        rows={2}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur safe-bottom">
        <div className="mx-auto flex max-w-2xl items-center justify-end">
          <Button onClick={finish} disabled={finishing} className="gap-2" size="lg">
            {finishing ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
            Finish
          </Button>
        </div>
      </div>
    </div>
  );
}

function PostureLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
      aria-label="View correct posture"
    >
      <ExternalLink className="size-3" /> Posture
    </a>
  );
}

function SaveButton({ status, onClick }: { status: Status; onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant={status === "dirty" ? "default" : "ghost"}
      className="ml-auto gap-1.5"
      disabled={status === "saving"}
      onClick={onClick}
    >
      {status === "saving" ? (
        <Loader2 className="size-4 animate-spin" />
      ) : status === "saved" ? (
        <Check className="size-4 text-primary" />
      ) : null}
      {status === "saved" ? "Saved" : "Save"}
    </Button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-medium uppercase text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
