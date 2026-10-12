"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Toggle } from "@/handbook/ui";
import { cn } from "@/lib/utils";

type LikeState = { liked: boolean; count: number };

const START: LikeState = { liked: false, count: 128 };

// A stand-in server call: resolves after a short delay, or rejects when the
// reader has turned "server rejects" on.
function saveLike(reject: boolean): Promise<void> {
  return new Promise((resolve, rejectFn) => {
    setTimeout(() => (reject ? rejectFn(new Error("The server rejected the like (rate limited).")) : resolve()), 600);
  });
}

export function OptimisticDemo() {
  const [state, setState] = useState<LikeState>(START);
  const [reject, setReject] = useState(false);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function handleLike() {
    if (pending) return;
    const previous = state;
    const optimistic: LikeState = { liked: !state.liked, count: state.count + (state.liked ? -1 : 1) };
    setState(optimistic);
    setPending(true);
    setNote("Updated the UI immediately, then sent the request…");
    try {
      await saveLike(reject);
      setNote("The server confirmed; the optimistic update stands.");
    } catch (error) {
      setState(previous); // roll back to the exact prior state
      setNote(`Rolled back to ${previous.count}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Toggle checked={reject} onCheckedChange={setReject} title="Server rejects the like" detail="Simulate a failed request to see the rollback." />

      <div className="flex items-center gap-4 rounded-lg border p-4">
        <Button variant={state.liked ? "default" : "outline"} onClick={handleLike} aria-pressed={state.liked} className="gap-2">
          <Heart aria-hidden className={cn("size-4", state.liked && "fill-current")} />
          {state.liked ? "Liked" : "Like"}
        </Button>
        <span className="font-mono text-sm tabular-nums">
          {state.count} like{state.count === 1 ? "" : "s"}
          {pending ? <span className="ml-2 text-foreground/60">saving…</span> : null}
        </span>
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-foreground/85">
        {note}
      </p>
      <p className="text-xs text-foreground/75">
        Optimistic UI assumes success for instant feedback, then reconciles: on failure it restores the exact previous value. The count stays correct across repeated clicks because each attempt snapshots and restores its own prior state.
      </p>
    </div>
  );
}
