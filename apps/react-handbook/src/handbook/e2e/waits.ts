// The waiting demo: a sample "Save" button whose status turns from "Saving…"
// to "Saved" after a random delay, checked three ways. Everything runs on real
// timers; only the app is a stand-in.

export type Strategy = "sleep" | "poll" | "auto";

export const STRATEGIES: readonly {
  id: Strategy;
  label: string;
  code: string;
  detail: string;
}[] = [
  {
    id: "sleep",
    label: "Fixed sleep",
    code: `await page.getByRole("button", { name: "Save" }).click();
await page.waitForTimeout(500);
expect(await page.getByRole("status").textContent()).toBe("Saved");`,
    detail: "Waits 500 ms, then reads the status once.",
  },
  {
    id: "poll",
    label: "Manual poll",
    code: `await page.getByRole("button", { name: "Save" }).click();
for (let i = 0; i < 3; i++) {
  if ((await page.getByRole("status").textContent()) === "Saved") break;
  await page.waitForTimeout(200);
}
expect(await page.getByRole("status").textContent()).toBe("Saved");`,
    detail: "Checks up to three times, 200 ms apart.",
  },
  {
    id: "auto",
    label: "Auto-waiting assertion",
    code: `await page.getByRole("button", { name: "Save" }).click();
await expect(page.getByRole("status")).toHaveText("Saved");`,
    detail: "Retries until the text matches or 5 s pass.",
  },
];

/** Playwright's default expect timeout and its retry intervals. */
export const EXPECT_TIMEOUT = 5000;
const RETRY_INTERVALS = [100, 250, 500, 1000];

export type RunResult = { pass: boolean; ms: number };

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Stopped", "AbortError"));
      },
      { once: true },
    );
  });
}

/** One sample app: clicking Save starts a save that finishes after `delay` ms. */
function startApp(delay: number) {
  let status = "Saving…";
  const id = setTimeout(() => (status = "Saved"), delay);
  return { read: () => status, stop: () => clearTimeout(id) };
}

export async function runOnce(
  strategy: Strategy,
  delay: number,
  signal: AbortSignal,
): Promise<RunResult> {
  const start = performance.now();
  const app = startApp(delay);
  try {
    if (strategy === "sleep") {
      await sleep(500, signal);
    } else if (strategy === "poll") {
      for (let i = 0; i < 3 && app.read() !== "Saved"; i++)
        await sleep(200, signal);
    } else {
      let attempt = 0;
      while (
        app.read() !== "Saved" &&
        performance.now() - start < EXPECT_TIMEOUT
      ) {
        await sleep(
          RETRY_INTERVALS[Math.min(attempt++, RETRY_INTERVALS.length - 1)],
          signal,
        );
      }
    }
    return { pass: app.read() === "Saved", ms: performance.now() - start };
  } finally {
    app.stop();
  }
}

/** A delay drawn from base ± variance (never below zero). */
export function drawDelay(base: number, variance: number) {
  return Math.max(0, base + (Math.random() * 2 - 1) * variance);
}
