"use client";

import { MousePointerClick, Timer, Zap } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { useIsolatedRoot } from "./isolated-root";

// A two-component app in its own root logs every step of an update: each
// render, the DOM change, layout and passive effects, and the next frame,
// with times relative to the moment the update was requested.

type Entry = { at: number; text: string; kind: "render" | "commit" | "layout" | "effect" | "frame" };

type Session = { start: number; entries: Entry[]; trigger: string };

class PhaseLog {
  session: Session | null = null;

  constructor(private readonly onDone: (session: Session) => void) {}

  begin(trigger: string) {
    const session: Session = { start: performance.now(), entries: [], trigger };
    this.session = session;
    requestAnimationFrame(() => {
      this.add("frame", "next frame starts (requestAnimationFrame)");
      setTimeout(() => this.add("frame", "after that frame was painted"));
    });
    setTimeout(() => {
      if (this.session === session) this.onDone(session);
    }, 400);
  }

  add(kind: Entry["kind"], text: string) {
    const s = this.session;
    if (s) s.entries.push({ at: performance.now() - s.start, text, kind });
  }
}

function Child({ count, log }: { count: number; log: PhaseLog }) {
  log.add("render", `render Child (count ${count})`);
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    log.add("layout", `layout effect Child: the DOM already says "${ref.current?.textContent}"`);
  }, [count, log]);
  useEffect(() => {
    log.add("effect", "effect Child");
  }, [count, log]);
  return <span ref={ref}>{count}</span>;
}

function Parent({ log }: { log: PhaseLog }) {
  const [count, setCount] = useState(0);
  const [, startTransition] = useTransition();
  log.add("render", `render Parent (count ${count})`);
  useLayoutEffect(() => {
    log.add("layout", "layout effect Parent");
  }, [count, log]);
  useEffect(() => {
    log.add("effect", "effect Parent");
  }, [count, log]);

  function handleClick() {
    log.begin("a click");
    setCount((c) => c + 1);
  }

  function handleTimer() {
    setTimeout(() => {
      log.begin("a timer");
      setCount((c) => c + 1);
    }, 50);
  }

  function handleTransition() {
    log.begin("a transition");
    startTransition(() => setCount((c) => c + 1));
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        Count: <Child count={count} log={log} />
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleClick}>
          <MousePointerClick aria-hidden />
          Update from a click
        </Button>
        <Button size="sm" variant="outline" onClick={handleTimer}>
          <Timer aria-hidden />
          Update from a timer
        </Button>
        <Button size="sm" variant="outline" onClick={handleTransition}>
          <Zap aria-hidden />
          Update in a transition
        </Button>
      </div>
    </div>
  );
}

const KIND_LABEL: Record<Entry["kind"], string> = { render: "render", commit: "commit", layout: "layout", effect: "effect", frame: "frame" };

export function PhasesDemo() {
  const [session, setSession] = useState<Session | null>(null);
  const [log] = useState(() => new PhaseLog((s) => setSession({ ...s, entries: [...s.entries].sort((a, b) => a.at - b.at) })));
  const container = useIsolatedRoot(useMemo(() => <Parent log={log} />, [log]));

  // A MutationObserver marks when React changed the DOM during the session.
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new MutationObserver(() => log.add("commit", "DOM changed (seen by a MutationObserver)"));
    observer.observe(el, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [log, container]);

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-2">
        <div ref={container} className="rounded-lg border border-dashed p-3" />
        <p className="text-xs text-muted-foreground">
          The app is real React in its own root. A MutationObserver reports DOM changes in a microtask, so it appears just after the synchronous work that caused it.
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-2" aria-live="polite">
        {session ? (
          <>
            <p className="text-sm font-medium">After {session.trigger}:</p>
            <ol className="flex flex-col gap-0.5 rounded-lg border p-2 font-mono text-xs">
              {session.entries.map((e, i) => (
                <li key={i} className="grid grid-cols-[3.5rem_4rem_1fr] gap-2">
                  <span className="text-right text-foreground/70 tabular-nums">{e.at.toFixed(1)} ms</span>
                  <span className="text-foreground/70">{KIND_LABEL[e.kind]}</span>
                  <span className={e.kind === "frame" ? "font-medium" : undefined}>{e.text}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Trigger an update to see its phases in order.</p>
        )}
      </div>
    </div>
  );
}
