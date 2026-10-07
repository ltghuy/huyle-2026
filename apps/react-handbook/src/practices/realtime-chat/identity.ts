import { displayNameSchema } from "@/server/practices/realtime-chat/chat.schema";

// Tab id: a fresh one per page load. The id is added to this tab's history
// (sessionStorage) only when the page unloads, so after a reload the tab still
// recognizes its earlier messages as its own. A tab opened or duplicated from
// this one copies sessionStorage while we're running, so it never inherits our
// current id: two open tabs never share one.
// Display name: one per browser (localStorage). Storage can throw in private
// modes, so both fall back to in-memory values.

const TAB_IDS_KEY = "chat:tab-ids";
const NAME_KEY = "chat:name";
const ADJECTIVES = ["Quiet", "Swift", "Curious", "Sunny", "Brave", "Clever", "Calm", "Lucky"];
const ANIMALS = ["Otter", "Falcon", "Panda", "Fox", "Koala", "Heron", "Lynx", "Gecko"];

let tabId: string | null = null;
let ownIds: Set<string> | null = null;
let name: string | null = null;

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function read(storage: () => Storage, key: string) {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value);
  } catch {
    // Keep the in-memory value.
  }
}

export function getTabId() {
  if (tabId) return tabId;
  const id = `tab-${crypto.randomUUID()}`;
  tabId = id;
  getOwnAuthorIds().add(id);
  window.addEventListener("pagehide", () => {
    const ids = [...getOwnAuthorIds()].slice(-20);
    write(() => sessionStorage, TAB_IDS_KEY, JSON.stringify(ids));
  });
  return id;
}

/** Every author id this tab has sent with, including before reloads. */
export function getOwnAuthorIds(): Set<string> {
  if (ownIds) return ownIds;
  try {
    const parsed = JSON.parse(read(() => sessionStorage, TAB_IDS_KEY) ?? "[]");
    ownIds = new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    ownIds = new Set();
  }
  return ownIds;
}

export function getDisplayName() {
  name ??= read(() => localStorage, NAME_KEY);
  if (!name || !displayNameSchema.safeParse(name).success) {
    name = `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
    write(() => localStorage, NAME_KEY, name);
  }
  return name;
}

/** Returns an error message, or null when the name was saved. */
export function setDisplayName(value: string): string | null {
  const parsed = displayNameSchema.safeParse(value);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid name";
  name = parsed.data;
  write(() => localStorage, NAME_KEY, name);
  return null;
}
