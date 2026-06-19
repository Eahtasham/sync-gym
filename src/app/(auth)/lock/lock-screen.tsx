"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPinAction, unlockAction } from "@/lib/actions/auth-actions";

type Profile = { id: string; name: string; hasPin: boolean };

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

export function LockScreen({ profiles }: { profiles: Profile[] }) {
  const [profile, setProfile] = useState<Profile | null>(
    profiles.length === 1 ? profiles[0] : null,
  );

  if (!profile) {
    return (
      <div className="flex w-full max-w-xs flex-col items-stretch gap-3">
        <p className="mb-1 text-center text-sm text-muted-foreground">
          Who&apos;s training?
        </p>
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProfile(p)}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left active:scale-[0.99] transition-transform"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
              {p.name.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 font-semibold">{p.name}</span>
            <span className="text-xs text-muted-foreground">
              {p.hasPin ? "Enter PIN" : "Set PIN"}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <PinPad
      profile={profile}
      canSwitch={profiles.length > 1}
      onBack={() => setProfile(null)}
    />
  );
}

function PinPad({
  profile,
  canSwitch,
  onBack,
}: {
  profile: Profile;
  canSwitch: boolean;
  onBack: () => void;
}) {
  const mode = profile.hasPin ? "unlock" : "create";
  const [digits, setDigits] = useState("");
  const [stage, setStage] = useState<"enter" | "confirm">("enter");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const handledRef = useRef<string | null>(null);

  function submit(pin: string, confirm?: string) {
    const fd = new FormData();
    fd.set("userId", profile.id);
    fd.set("pin", pin);
    if (confirm !== undefined) fd.set("confirm", confirm);
    startTransition(async () => {
      const action = mode === "create" ? createPinAction : unlockAction;
      const res = await action({}, fd);
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

  function handleComplete(pin: string) {
    setError(null);
    if (mode === "unlock") {
      submit(pin);
      return;
    }
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
        ? `Choose a PIN for ${profile.name}`
        : "Confirm your PIN"
      : `Enter ${profile.name}'s PIN`;

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-4">
        {canSwitch && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-muted-foreground"
          >
            <ChevronLeft className="size-4" /> Switch profile
          </button>
        )}
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
