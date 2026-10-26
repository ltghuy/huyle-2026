import "server-only";
import {
  broadcastSeen,
  broadcastTyping,
  postMessage,
  setPresenceListener,
} from "./chat.room";
import type { Activity, ChatMessage } from "./chat.schema";

// Simulated participants. They only run while at least one stream is open.
// State lives on globalThis so a dev reload doesn't start a second set of timers.

const BOTS = ["Mai Nguyen", "Lukas Becker", "Aisha Khan", "Diego Alvarez", "Hana Sato"];
const CHATTER = [
  "Did anyone else notice the build got faster?",
  "I'm moving the retro to Friday.",
  "Pairing on the chat practice this afternoon, anyone in?",
  "New coffee beans in the kitchen ☕",
  "Reminder: release notes are due today.",
  "That bug was a missing await. Classic.",
  "Shipping the dark mode fix now.",
  "Has anyone tried the new profiler?",
  "Brb, meeting.",
  "LGTM, merging.",
];
const REPLIES = [
  "Good point!",
  "Agreed 👍",
  "Hmm, let me check and get back to you.",
  "Haha, true.",
  "Can you say more about that?",
  "Thanks, that helps.",
  "On it.",
];
const BURST_SIZE = 50;
const BURST_MS = 3000;
const TYPING_MS = 1200;

type BotState = {
  activity: Activity;
  /** Activity to return to after a burst. */
  afterBurst: Exclude<Activity, "burst">;
  active: boolean;
  timers: Set<ReturnType<typeof setTimeout>>;
  counter: number;
};

const globalBots = globalThis as typeof globalThis & { __chatBots?: BotState };
const state = (globalBots.__chatBots ??= {
  activity: "normal",
  afterBurst: "normal",
  active: false,
  timers: new Set(),
  counter: 0,
});

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function later(ms: number, run: () => void) {
  const timer = setTimeout(() => {
    state.timers.delete(timer);
    run();
  }, ms);
  state.timers.add(timer);
}

function clearAll() {
  for (const timer of state.timers) clearTimeout(timer);
  state.timers.clear();
}

function post(name: string, text: string) {
  postMessage({
    clientId: `bot-${Date.now()}-${++state.counter}`,
    authorId: `bot:${name}`,
    authorName: name,
    text,
  });
}

/** Shows typing for a moment, then posts. */
function typeAndPost(name: string, text: string) {
  broadcastTyping(`bot:${name}`, name, true);
  later(TYPING_MS, () => {
    broadcastTyping(`bot:${name}`, name, false);
    post(name, text);
  });
}

function scheduleChatter() {
  if (!state.active || state.activity !== "normal") return;
  later(4000 + Math.random() * 5000, () => {
    typeAndPost(pick(BOTS), pick(CHATTER));
    scheduleChatter();
  });
}

function startBurst() {
  for (let i = 0; i < BURST_SIZE; i++) {
    later((i * BURST_MS) / BURST_SIZE, () => post(pick(BOTS), `${pick(CHATTER)} (burst ${i + 1})`));
  }
  // Go back to the previous activity once the burst is out.
  later(BURST_MS + 100, () => {
    if (state.activity === "burst") setActivity(state.afterBurst);
  });
}

function restart() {
  clearAll();
  if (!state.active) return;
  if (state.activity === "normal") scheduleChatter();
  if (state.activity === "burst") startBurst();
}

export function setActivity(activity: Activity) {
  if (activity === "burst" && state.activity !== "burst") state.afterBurst = state.activity;
  state.activity = activity;
  restart();
  return state.activity;
}

export function getActivity() {
  return state.activity;
}

/** Bots notice a user's message: one of them sees it, and sometimes replies. */
export function onUserMessage(message: ChatMessage) {
  if (!state.active || state.activity === "off") return;
  const bot = pick(BOTS);
  later(1000 + Math.random() * 2000, () => broadcastSeen(`bot:${bot}`, message.seq));
  if (Math.random() < 0.6) {
    later(1500 + Math.random() * 2000, () => typeAndPost(bot, pick(REPLIES)));
  }
}

setPresenceListener((active) => {
  if (state.active === active) return;
  state.active = active;
  restart();
});
