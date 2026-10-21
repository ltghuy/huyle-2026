import type { Level } from "./suite-model";

// The "choose the level" exercise. Each case comes from a practice or topic on
// this site. `notes` says what a test at each level would buy, miss or cost.

export type Case = {
  id: string;
  title: string;
  recommended: Level;
  accepted: readonly Level[];
  reason: string;
  notes: Record<Level, string>;
};

export const LEVEL_LABEL: Record<Level, string> = {
  static: "Static check",
  unit: "Unit",
  integration: "Integration",
  e2e: "End to end",
};

export const CASES: readonly Case[] = [
  {
    id: "prop-type",
    title: "A component is given a number where its prop expects a string",
    recommended: "static",
    accepted: ["static"],
    reason: "The type checker sees it before anything runs, on every file, for free.",
    notes: {
      static: "Caught as you type, everywhere the component is used.",
      unit: "Only caught where a test happens to pass the wrong value.",
      integration: "Only caught on the screens a test renders, and only if the wrong value changes the output.",
      e2e: "Caught late, if at all, and the failure points at the screen, not the line.",
    },
  },
  {
    id: "format-price",
    title: "A price helper rounds half a cent and shows the right currency sign",
    recommended: "unit",
    accepted: ["unit"],
    reason: "Pure logic with many inputs: each extra case costs a millisecond.",
    notes: {
      static: "Types can't tell 26.95 from 26.96.",
      unit: "Dozens of inputs and currencies in milliseconds.",
      integration: "Works, but each case renders a screen to check one string.",
      e2e: "A few inputs at seconds each; the edge cases go untested.",
    },
  },
  {
    id: "cart-reducer",
    title: "The cart reducer adds, removes and applies a discount code",
    recommended: "unit",
    accepted: ["unit", "integration"],
    reason: "A reducer is a pure function of state and action. Test it directly, then cover the wiring once with an integration test.",
    notes: {
      static: "Types check the action shapes, not the totals.",
      unit: "Every action and edge case, with no rendering.",
      integration: "Also fine: drive the cart through its components to prove the reducer is wired in.",
      e2e: "Slow for a rule that has no browser or server in it.",
    },
  },
  {
    id: "form-errors",
    title: "The multi-step form blocks Next until the step is valid and shows each error on its field",
    recommended: "integration",
    accepted: ["integration"],
    reason: "The behaviour comes from the form, its validation and its messages working together, which a rendered component test shows with real typing and clicking.",
    notes: {
      static: "Types can't see which field shows the message.",
      unit: "Testing the validation function alone misses an error rendered on the wrong field.",
      integration: "Type, press Next, read the message next to the field, all in a fraction of a second.",
      e2e: "Works, but every rule in the form becomes a multi-second browser test.",
    },
  },
  {
    id: "stale-search",
    title: "The debounced search ignores a response that arrives after a newer one",
    recommended: "integration",
    accepted: ["integration"],
    reason: "The bug is about timing. A fake network and fake timers put the order of responses under the test's control.",
    notes: {
      static: "Nothing about time order is visible to types.",
      unit: "Can test the latest-request guard, but not the debounce, cache and rendering around it.",
      integration: "Release the older response last on purpose and check the screen keeps the newer results.",
      e2e: "A real network rarely reorders responses on cue, so the test is either flaky or never sees the bug.",
    },
  },
  {
    id: "token-refresh",
    title: "An expired access token is refreshed once and the failed request is retried",
    recommended: "integration",
    accepted: ["integration", "e2e"],
    reason: "Fake the auth server to expire the token on demand, and check the client refreshes once and retries. One end-to-end test can prove the real server agrees.",
    notes: {
      static: "Types can't tell an expired token from a valid one.",
      unit: "Misses the interplay of two requests and the retry.",
      integration: "Expire on demand, count refresh calls, see the retried request succeed.",
      e2e: "Also fine for one happy path, but waiting for real expiry is slow.",
    },
  },
  {
    id: "modal-focus",
    title: "The modal traps focus while open and returns it to the opener on close",
    recommended: "e2e",
    accepted: ["e2e", "integration"],
    reason: "Focus order, Tab and Escape behave exactly only in a real browser; a simulated DOM gets parts of focus handling wrong.",
    notes: {
      static: "Types know nothing about focus.",
      unit: "There's no unit small enough to hold the behaviour.",
      integration: "Useful in a simulated DOM, but its focus and Tab handling differ from a browser's.",
      e2e: "Real Tab presses and real focus, as users and assistive tech get them.",
    },
  },
  {
    id: "checkout",
    title: "A shopper goes from the product list to the cart to a confirmed order",
    recommended: "e2e",
    accepted: ["e2e"],
    reason: "A journey across pages, routing, cookies and the server. It's the path that would cost the most if it broke, so it earns a slow test.",
    notes: {
      static: "Types can't follow a journey across pages.",
      unit: "No single unit holds the journey.",
      integration: "Covers each screen, not the routing, cookies and server between them.",
      e2e: "Drives the real app through the whole path, once per release-critical journey.",
    },
  },
];

export const QUESTIONS = [
  "Is it pure logic with many inputs? Test it as a unit.",
  "Does it come from pieces working together on one screen? Test it as an integration, with the network faked.",
  "Does it cross pages, a real server, cookies or the browser's own behaviour? Test it end to end.",
  "How costly is a miss? The most expensive journeys earn a slow test even when lower levels cover parts of them.",
] as const;
