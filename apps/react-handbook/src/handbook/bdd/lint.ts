import type { Pickle } from "@cucumber/messages";

// Checks for scenarios that describe clicks instead of behaviour. Each rule is
// a heuristic with its reason, shown next to the scenario.

const UI_WORDS = /\b(click(s|ed)?|press(es|ed)?|tap(s|ped)?|type(s|d)?|fill(s|ed)?( in)?|select(s|ed)?|button|field|textbox|text box|checkbox|dropdown|link|element|screen|url|scroll)\b/gi;
const SELECTOR = /"[.#][\w-]+"/g;
const HIDDEN = /\b(database|api|request|response|local ?storage|session ?storage|cookie|reducer|redux|css|class name|html|dom)\b/gi;

export type Finding = { rule: string; detail: string };

export function lintPickle(pickle: Pickle): Finding[] {
  const findings: Finding[] = [];
  const ui = new Set<string>();
  const hidden = new Set<string>();
  let actions = 0;
  let outcomes = 0;
  for (const step of pickle.steps) {
    for (const m of step.text.matchAll(UI_WORDS)) ui.add(m[0].toLowerCase());
    if (step.type === "Action") actions += 1;
    if (step.type === "Outcome") {
      outcomes += 1;
      for (const m of step.text.matchAll(HIDDEN)) hidden.add(m[0].toLowerCase());
    }
  }
  if (ui.size > 0) {
    findings.push({ rule: "Names the interface", detail: `"${[...ui].join('", "')}": say what the user wants to do, and let the step definition know which button does it. A redesign then changes code, not the scenario.` });
  }
  const selectors = pickle.steps.flatMap((step) => [...step.text.matchAll(SELECTOR)].map((m) => m[0]));
  if (selectors.length > 0) {
    findings.push({ rule: "Uses a selector", detail: `${selectors.join(", ")}: selectors belong in page objects; a reader can't tell what they mean and a restyle breaks them.` });
  }
  if (actions > 1) findings.push({ rule: "More than one action", detail: `${actions} When steps: one scenario should check one behaviour. Move setup into Given, or split the scenario.` });
  if (pickle.steps.length > 7) findings.push({ rule: "Long", detail: `${pickle.steps.length} steps: a reader loses the rule. Hide the setup in fewer, higher-level Given steps.` });
  if (outcomes === 0) findings.push({ rule: "No Then", detail: "The scenario never says what should happen, so it checks nothing." });
  if (hidden.size > 0) findings.push({ rule: "Checks what the user can't see", detail: `"${[...hidden].join('", "')}": an end-to-end scenario should check what a user sees; test internals at a lower level.` });
  return findings;
}
