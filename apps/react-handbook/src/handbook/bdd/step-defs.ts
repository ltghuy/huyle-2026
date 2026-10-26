import type { StepDef } from "./gherkin";

// Reads the step definitions out of the recorded step files, so the page lists
// exactly the steps the suite ran with.

const STEP = /^(Given|When|Then)\("((?:[^"\\]|\\.)*)",[\s\S]*?^\}\);$/gm;
const CALL = /\b(cartPage|formPage|searchPage|modalPage|toastPage)\.(\w+)/g;

export function readStepDefs(files: Record<string, string | null>): StepDef[] {
  const defs: StepDef[] = [];
  for (const [file, text] of Object.entries(files)) {
    if (!text) continue;
    for (const m of text.matchAll(STEP)) {
      const source = m[0];
      const calls = [...new Set([...source.matchAll(CALL)].map((c) => `${c[1]}.${c[2]}`))];
      defs.push({
        keyword: m[1] as StepDef["keyword"],
        pattern: JSON.parse(`"${m[2]}"`) as string,
        file,
        line: text.slice(0, m.index).split("\n").length,
        source,
        calls,
      });
    }
  }
  return defs;
}
