"use client";

import { useEffect, useState } from "react";

/** Time left until `deadline` on the room's clock (`offset` = room clock − this device's). */
export function msLeft(deadline: number | null, offset: number, now = Date.now()): number {
  if (deadline === null) return 0;
  return Math.max(0, deadline - (now + offset));
}

/**
 * Milliseconds left until a room deadline, refreshed a few times a second. Use it in the small
 * component that shows the time, so only that component re-renders as the clock runs.
 */
export function useCountdown(deadline: number | null, offset: number, intervalMs = 200): number {
  const [left, setLeft] = useState(() => msLeft(deadline, offset));
  useEffect(() => {
    const update = () => setLeft(msLeft(deadline, offset));
    update();
    if (deadline === null) return;
    const timer = setInterval(update, intervalMs);
    return () => clearInterval(timer);
  }, [deadline, offset, intervalMs]);
  return left;
}
