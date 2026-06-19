"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in Vercel function logs to help diagnose.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
        <AlertTriangle className="size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          The app hit an error loading this page.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70">Ref: {error.digest}</p>
        )}
      </div>
      <Button onClick={reset} className="gap-2">
        <RotateCw className="size-4" /> Try again
      </Button>
    </main>
  );
}
