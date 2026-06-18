"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { changePinAction } from "@/lib/actions/auth-actions";
import { clearAllHistory } from "@/lib/actions/settings";

export function ChangePinForm() {
  const [state, formAction, pending] = useActionState(changePinAction, {});
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state.success) {
      toast.success("PIN updated");
      setResetKey((k) => k + 1);
    }
  }, [state]);

  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-primary" />
        <h2 className="font-semibold">Change PIN</h2>
      </div>
      <form key={resetKey} action={formAction} className="space-y-3">
        <PinField name="current" label="Current PIN" />
        <PinField name="next" label="New PIN" />
        <PinField name="confirm" label="Confirm new PIN" />
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Update PIN
        </Button>
      </form>
    </Card>
  );
}

function PinField({ name, label }: { name: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="password"
        inputMode="numeric"
        maxLength={4}
        autoComplete="off"
        placeholder="••••"
        className="tracking-[0.4em]"
      />
    </div>
  );
}

export function DangerZone() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Card className="gap-4 border-destructive/30 p-4">
      <div className="flex items-center gap-2">
        <Trash2 className="size-4 text-destructive" />
        <h2 className="font-semibold">Clear history</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Delete all logged sessions. Your workout days and exercises are kept.
      </p>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="outline" className="border-destructive/40 text-destructive">
              Clear all history
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all history?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every logged session. Templates stay. This
              can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() =>
                start(async () => {
                  await clearAllHistory();
                  toast.success("History cleared");
                  router.refresh();
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Delete all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
