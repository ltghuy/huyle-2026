import type {
  Activity,
  ChatMessage,
  HistoryPage,
  SendBody,
} from "@/server/practices/realtime-chat/chat.schema";

export const BASE = "/api/practices/realtime-chat";

/** Read at request time, so demo controls apply to the next request. */
export const network = {
  /** -1 = random 100–2000 ms. */
  latencyMs: 300,
  /** Failure rate for sends and history loads, 0–1. */
  failRate: 0,
};

async function readJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  return json.data as T;
}

function networkParams(failRate: number) {
  return new URLSearchParams({ latencyMs: String(network.latencyMs), failRate: String(failRate) });
}

export async function fetchHistory(before: number | null, signal?: AbortSignal) {
  const params = networkParams(network.failRate);
  if (before !== null) params.set("before", String(before));
  return readJson<HistoryPage>(await fetch(`${BASE}/messages?${params}`, { signal }));
}

export async function sendMessage(body: SendBody, signal: AbortSignal) {
  const res = await fetch(`${BASE}/messages?${networkParams(network.failRate)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  return readJson<ChatMessage>(res);
}

function post(path: string, body: unknown) {
  return fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Fire-and-forget: a lost typing or seen signal only delays a hint. */
export function postTyping(authorId: string, authorName: string, typing: boolean) {
  void post("typing", { authorId, authorName, typing }).catch(() => {});
}

export function postSeen(authorId: string, upToSeq: number) {
  void post("seen", { authorId, upToSeq }).catch(() => {});
}

export async function dropConnection(tabId: string) {
  return readJson<{ dropped: number }>(await post("control", { action: "drop", tabId }));
}

export async function clearConversation(authorId: string, authorName: string) {
  return readJson<{ cleared: number }>(await post("control", { action: "clear", authorId, authorName }));
}

export async function setActivity(value: Activity) {
  return readJson<{ activity: Activity }>(await post("control", { action: "activity", value }));
}

export async function getActivity() {
  return readJson<{ activity: Activity }>(await fetch(`${BASE}/control`));
}

export function streamUrl(tabId: string, after: number) {
  return `${BASE}/stream?${new URLSearchParams({ tabId, after: String(after) })}`;
}
