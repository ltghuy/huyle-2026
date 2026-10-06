import "server-only";
import { FAQ_ENTRIES } from "./faq.data";
import type { FaqEntry, FaqQuery } from "./faq.schema";

const LARGE_COPIES = 10;

// The large set repeats the content with numbered variants. The first copy
// keeps the original ids so open sections survive a size switch.
function largeSet(): FaqEntry[] {
  const entries: FaqEntry[] = [];
  for (let n = 1; n <= LARGE_COPIES; n++) {
    for (const e of FAQ_ENTRIES) {
      entries.push(
        n === 1
          ? e
          : { ...e, id: `${e.id}-${n}`, question: `${e.question} (variant ${n})` },
      );
    }
  }
  return entries;
}

export async function getFaq({
  size,
  latencyMs,
  failRate,
}: FaqQuery): Promise<FaqEntry[] | null> {
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  if (Math.random() < failRate) return null;
  return size === "large" ? largeSet() : FAQ_ENTRIES;
}
