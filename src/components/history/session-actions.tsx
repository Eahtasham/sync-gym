"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { deleteSession, duplicateSession } from "@/lib/actions/sessions";

export function SessionActions({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [dup, startDup] = useTransition();
  const [del, startDel] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        className="flex-1 gap-2"
        disabled={dup}
        onClick={() => startDup(() => duplicateSession(sessionId))}
      >
        {dup ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
        Repeat workout
      </Button>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="outline" size="icon" aria-label="Delete session">
              <Trash2 className="size-5 text-destructive" />
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes this logged workout. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() =>
                startDel(async () => {
                  await deleteSession(sessionId);
                  toast.success("Session deleted");
                  router.push("/history");
                })
              }
            >
              {del ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
