"use client";

import { useCountdown } from "./use-countdown";

/** "còn 25 giây" until `deadline` on this device's clock (feature 035). Re-renders only itself. */
export function SecondsLeft({ deadline }: { deadline: number }) {
  const left = useCountdown(deadline, 0, 500);
  return <span className="tabular-nums">còn {Math.ceil(left / 1000)} giây</span>;
}
