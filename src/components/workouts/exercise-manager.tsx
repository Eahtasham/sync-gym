"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  HeartPulse,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ExerciseType } from "@/lib/types";
import {
  createExercise,
  deleteExercise,
  reorderExercises,
  toggleFavorite,
  updateExercise,
} from "@/lib/actions/exercises";

type Ex = {
  id: string;
  name: string;
  type: ExerciseType;
  isFavorite: boolean;
};

export function ExerciseManager({
  dayId,
  initial,
}: {
  dayId: string;
  initial: Ex[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ex | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<ExerciseType>("STRENGTH");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Ex | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) => e.name.toLowerCase().includes(q));
  }, [items, query]);

  const searching = query.trim().length > 0;

  function openAdd() {
    setEditing(null);
    setName("");
    setType("STRENGTH");
    setFormOpen(true);
  }
  function openEdit(ex: Ex) {
    setEditing(ex);
    setName(ex.name);
    setType(ex.type);
    setFormOpen(true);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (editing) {
        await updateExercise(editing.id, { name: trimmed, type });
        setItems((it) =>
          it.map((x) => (x.id === editing.id ? { ...x, name: trimmed, type } : x)),
        );
        toast.success("Exercise updated");
      } else {
        await createExercise({ workoutDayId: dayId, name: trimmed, type });
        toast.success("Exercise added");
        router.refresh();
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
    setItems((it) => it.filter((x) => x.id !== target.id));
    try {
      await deleteExercise(target.id);
      toast.success("Exercise deleted");
    } catch {
      toast.error("Could not delete");
      router.refresh();
    }
  }

  function fav(ex: Ex) {
    setItems((it) =>
      it.map((x) => (x.id === ex.id ? { ...x, isFavorite: !x.isFavorite } : x)),
    );
    startTransition(() => {
      toggleFavorite(ex.id).catch(() => router.refresh());
    });
  }

  function move(id: string, dir: -1 | 1) {
    const index = items.findIndex((e) => e.id === id);
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    startTransition(() => {
      reorderExercises(dayId, next.map((e) => e.id)).catch(() => router.refresh());
    });
  }

  return (
    <>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          className="pl-9"
          inputMode="search"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {searching ? "No matching exercises." : "No exercises yet. Add one below."}
          </Card>
        )}
        {filtered.map((ex) => {
          const idx = items.findIndex((e) => e.id === ex.id);
          return (
            <Card key={ex.id} className="flex-row items-center gap-2 p-3">
              <div
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
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{ex.name}</div>
                <div className="text-xs capitalize text-muted-foreground">
                  {ex.type.toLowerCase()}
                </div>
              </div>

              <button
                type="button"
                aria-label="Toggle favorite"
                onClick={() => fav(ex)}
                className="p-1.5 text-muted-foreground"
              >
                <Star
                  className={cn(
                    "size-5",
                    ex.isFavorite && "fill-yellow-400 text-yellow-400",
                  )}
                />
              </button>

              {!searching && (
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={idx === 0}
                    onClick={() => move(ex.id, -1)}
                    className="text-muted-foreground disabled:opacity-20"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={idx === items.length - 1}
                    onClick={() => move(ex.id, 1)}
                    className="text-muted-foreground disabled:opacity-20"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreVertical className="size-5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(ex)}>
                    <Pencil className="size-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget(ex)}
                  >
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Card>
          );
        })}
      </div>

      <Button onClick={openAdd} className="mt-4 w-full gap-2" variant="secondary">
        <Plus className="size-5" /> Add exercise
      </Button>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit exercise" : "Add exercise"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bench Press"
              maxLength={60}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <Select
              value={type}
              items={{ STRENGTH: "Strength", CARDIO: "Cardio" }}
              onValueChange={(v) => v && setType(v as ExerciseType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STRENGTH">Strength</SelectItem>
                <SelectItem value="CARDIO">Cardio</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the exercise from this workout day. This can’t be undone.
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
