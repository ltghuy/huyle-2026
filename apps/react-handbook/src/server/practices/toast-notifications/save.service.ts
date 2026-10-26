import "server-only";
import type { SaveRequest, SaveResponse } from "./save.schema";

// Simulated save: waits for the requested latency, then fails at random.
export async function simulateSave({
  latencyMs,
  failRate,
}: SaveRequest): Promise<SaveResponse | null> {
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  if (Math.random() < failRate) return null;
  return { savedAt: new Date().toISOString() };
}
