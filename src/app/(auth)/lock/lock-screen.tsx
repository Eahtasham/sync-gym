"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPinAction, unlockAction } from "@/lib/actions/auth-actions";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

function Dots({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-center gap-4">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "size-4 rounded-full border-2 border-muted-foreground/40 transition-colors",
            i < count && "border-primary bg-primary",
          )}
        />
      ))}
    </div>
  );
}

export function LockScreen({ mode }: { mode: "create" | "unlock" }) {
  const [digits, setDigits] = useState("");
  const [stage, setStage] = useState<"enter" | "confirm">("enter");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(pin: string, confirm?: string) {
    const fd = new FormData();
    fd.set("pin", pin);
    if (confirm !== undefined) fd.set("confirm", confirm);
    startTransition(async () => {
      const action = mode === "create" ? createPinAction : unlockAction;
      const res = await action({}, fd);
      // On success the action redirects; we only get here on error.
      if (res?.error) {
        setError(res.error);
        setDigits("");
        if (mode === "create") {
          setStage("enter");
          setFirstPin("");
        }
      }
    });
  }

  const handledRef = useRef<string | null>(null);

  function handleComplete(pin: string) {
    setError(null);
    if (mode === "unlock") {
      submit(pin);
      return;
    }
    // create mode: two-step
    if (stage === "enter") {
      setFirstPin(pin);
      setStage("confirm");
      setDigits("");
    } else {
      if (pin !== firstPin) {
        setError("PINs do not match");
        setStage("enter");
        setFirstPin("");
        setDigits("");
        return;
      }
      submit(firstPin, pin);
    }
  }

  // When 4 digits are entered, run completion (after the 4th dot has painted).
  useEffect(() => {
    if (digits.length === 4 && handledRef.current !== digits) {
      handledRef.current = digits;
      handleComplete(digits);
    }
    if (digits.length < 4) handledRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  function press(key: string) {
    if (pending) return;
    if (key === "del") {
      setError(null);
      setDigits((d) => d.slice(0, -1));
      return;
    }
    if (!key) return;
    setError(null);
    setDigits((d) => (d.length >= 4 ? d : d + key));
  }

  const label =
    mode === "create"
      ? stage === "enter"
        ? "Choose a PIN"
        : "Confirm your PIN"
      : "Enter PIN";

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Dots count={digits.length} />
        <span
          className={cn(
            "h-5 text-sm font-medium text-destructive transition-opacity",
            error ? "opacity-100" : "opacity-0",
          )}
        >
          {error ?? "."}
        </span>
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        {KEYS.map((key, i) =>
          key === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={pending}
              onClick={() => press(key)}
              className={cn(
                "flex h-16 touch-manipulation items-center justify-center rounded-2xl bg-card text-2xl font-semibold",
                "border border-border active:scale-95 active:bg-accent transition-transform",
                "disabled:opacity-50 select-none",
              )}
            >
              {key === "del" ? <Delete className="size-6" /> : key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
