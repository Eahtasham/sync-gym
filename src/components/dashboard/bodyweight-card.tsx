"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { logBodyweight } from "@/lib/actions/bodyweight";
import { kg } from "@/lib/format";

export function BodyweightCard({
  latest,
}: {
  latest: { weightKg: number; deltaKg: number | null } | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();

  function save() {
    const n = parseFloat(value);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a valid weight");
      return;
    }
    start(async () => {
      await logBodyweight(n);
      toast.success("Weight logged");
      setValue("");
      setOpen(false);
    });
  }

  const delta = latest?.deltaKg ?? null;

  return (
    <Card className="gap-0 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Scale className="size-4 text-primary" />
          <span className="text-xs font-medium">Bodyweight</span>
        </div>
        {delta != null && delta !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-xs ${
              delta < 0 ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {delta < 0 ? (
              <TrendingDown className="size-3.5" />
            ) : (
              <TrendingUp className="size-3.5" />
            )}
            {Math.abs(delta)}kg
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold">
          {latest ? kg(latest.weightKg) : "—"}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="sm" variant="secondary" className="gap-1.5">
                <Plus className="size-4" /> Log
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log bodyweight</DialogTitle>
            </DialogHeader>
            <Input
              autoFocus
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Weight in kg"
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="h-12 text-lg"
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
