"use client";

import { useEffect, useRef, useState } from "react";

/** Listens for one kind of message from a sandboxed frame; resets when `key` changes. */
export function useFrameReport<T>(kind: string, key: string) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [report, setReport] = useState<{ key: string; data: T } | null>(null);
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.data?.kind !== kind) return;
      setReport({ key, data: event.data as T });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [kind, key]);
  return { frame, report: report?.key === key ? report.data : null };
}
