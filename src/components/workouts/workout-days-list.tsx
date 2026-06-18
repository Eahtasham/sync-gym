"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronRight,
  Dumbbell,
  GripVertical,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  createWorkoutDay,
  deleteWorkoutDay,
  reorderWorkoutDays,
  updateWorkoutDay,
} from "@/lib/actions/workout-days";

type Day = { id: string; name: string; exerciseCount: number };

export function WorkoutDaysList({ initialDays }: { initialDays: Day[] }) {
  const router = useRouter();
  const [days, setDays] = useState(initialDays);
  const [, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Day | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Day | null>(null);

  function openAdd() {
    setEditing(null);
    setName("");
    setFormOpen(true);
  }
  function openEdit(day: Day) {
    setEditing(day);
    setName(day.name);
    setFormOpen(true);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (editing) {
        await updateWorkoutDay(editing.id, trimmed);
        setDays((d) =>
          d.map((x) => (x.id === editing.id ? { ...x, name: trimmed } : x)),
        );
        toast.success("Workout updated");
      } else {
        const created = await createWorkoutDay(trimmed);
        setDays((d) => [...d, { id: created.id, name: created.name, exerciseCount: 0 }]);
        toast.success("Workout created");
      }
      setFormOpen(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setDays((d) => d.filter((x) => x.id !== target.id));
    try {
      await deleteWorkoutDay(target.id);
      toast.success("Workout deleted");
    } catch {
      toast.error("Could not delete");
      router.refresh();
    }
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= days.length) return;
    const next = [...days];
    [next[index], next[target]] = [next[target], next[index]];
    setDays(next);
    startTransition(() => {
      reorderWorkoutDays(next.map((d) => d.id)).catch(() => router.refresh());
    });
  }

  return (
    <>
      <div className="space-y-2">
        {days.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No workout days yet. Create your first one.
          </Card>
        )}
        {days.map((day, i) => (
          <Card key={day.id} className="flex-row items-center gap-1 p-2 pr-1">
            <div className="flex flex-col">
              <button
                type="button"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="px-1 text-muted-foreground disabled:opacity-20"
              >
                <GripVertical className="size-4 rotate-90" />
              </button>
            </div>
            <Link
              href={`/workouts/${day.id}`}
              className="flex flex-1 items-center gap-3 rounded-lg px-2 py-2 active:bg-accent"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Dumbbell className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{day.name}</div>
                <div className="text-xs text-muted-foreground">
                  {day.exerciseCount} exercise{day.exerciseCount === 1 ? "" : "s"}
                </div>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreVertical className="size-5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(day)}>
                  <Pencil className="size-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => move(i, -1)} disabled={i === 0}>
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => move(i, 1)}
                  disabled={i === days.length - 1}
                >
                  Move down
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteTarget(day)}
                >
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Card>
        ))}
      </div>

      <Button onClick={openAdd} className="mt-4 w-full gap-2" variant="secondary">
        <Plus className="size-5" /> New workout day
      </Button>

      {/* Add / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Rename workout" : "New workout day"}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chest Day"
            maxLength={50}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the workout day, its exercises, and any sessions logged
              under it. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
