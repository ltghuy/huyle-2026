import { beforeEach, describe, expect, it, vi } from "vitest";

let signedIn = true;
let throttled = false;
vi.mock("@/server/auth/session", () => ({
  requireUser: async () =>
    signedIn
      ? { user: { id: "minh", name: "Minh Anh", email: "minh@example.com", image: null } }
      : { response: Response.json({ error: { message: "Bạn cần đăng nhập để tiếp tục." } }, { status: 401 }) },
}));
vi.mock("@/server/db", () => ({ getDb: () => ({}) }));
vi.mock("@/server/social/request", async (original) => ({
  ...(await original<typeof import("@/server/social/request")>()),
  isThrottled: async () => throttled,
}));
const pulse = vi.fn();
vi.mock("@/server/social/pulse.service", () => ({ pulse: (...args: unknown[]) => pulse(...args) }));
const leave = vi.fn();
vi.mock("@/server/social/presence.service", () => ({ leave: (...args: unknown[]) => leave(...args) }));
const sendRequest = vi.fn();
const respond = vi.fn();
const removeFriend = vi.fn();
vi.mock("@/server/social/friends.service", () => ({
  sendRequest: (...args: unknown[]) => sendRequest(...args),
  respond: (...args: unknown[]) => respond(...args),
  removeFriend: (...args: unknown[]) => removeFriend(...args),
}));
const listNotifications = vi.fn();
const markAllRead = vi.fn();
vi.mock("@/server/social/notifications.service", () => ({
  listNotifications: (...args: unknown[]) => listNotifications(...args),
  markAllRead: (...args: unknown[]) => markAllRead(...args),
}));

const pulseRoute = await import("./pulse/route");
const leaveRoute = await import("./leave/route");
const requestsRoute = await import("./requests/route");
const respondRoute = await import("./requests/respond/route");
const removeRoute = await import("./friends/remove/route");
const notificationsRoute = await import("./notifications/route");
const readRoute = await import("./notifications/read/route");

const URL = "https://english.huyle.work/api/social";
const post = (route: { POST: (r: Request) => Promise<Response> }, body?: unknown) =>
  route.POST(new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }));
const get = (route: { GET: (r: Request) => Promise<Response> }) => route.GET(new Request(URL));

beforeEach(() => {
  signedIn = true;
  throttled = false;
  for (const mock of [pulse, leave, sendRequest, respond, removeFriend, listNotifications, markAllRead]) mock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("social routes (feature 031)", () => {
  it("refuse guests on every route (AC-009, AC-031)", async () => {
    signedIn = false;
    const statuses = await Promise.all([
      post(pulseRoute),
      post(leaveRoute),
      post(requestsRoute, { userId: "lan" }),
      post(respondRoute, { userId: "lan", accept: true }),
      post(removeRoute, { userId: "lan" }),
      get(notificationsRoute),
      post(readRoute),
    ]);
    expect(statuses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401, 401, 401]);
  });

  it("use only the session's id", async () => {
    pulse.mockResolvedValue({ now: 1, friends: [], outgoing: [], incoming: [], unread: 0 });
    listNotifications.mockResolvedValue({ now: 1, items: [] });
    sendRequest.mockResolvedValue({ ok: true, state: "sent" });
    respond.mockResolvedValue({ ok: true, state: "friends" });
    const pulsed = await post(pulseRoute);
    expect(pulsed.status).toBe(200);
    expect(pulsed.headers.get("cache-control")).toBe("no-store");
    expect((await post(leaveRoute)).status).toBe(204);
    expect(await (await post(requestsRoute, { userId: "lan" })).json()).toEqual({ state: "sent" });
    expect(await (await post(respondRoute, { userId: "lan", accept: true })).json()).toEqual({ state: "friends" });
    expect((await post(removeRoute, { userId: "lan" })).status).toBe(204);
    expect((await get(notificationsRoute)).status).toBe(200);
    expect((await post(readRoute)).status).toBe(204);
    for (const mock of [pulse, leave, sendRequest, respond, removeFriend, listNotifications, markAllRead]) expect(mock.mock.calls[0][1]).toBe("minh");
    expect(sendRequest.mock.calls[0][2]).toBe("lan");
  });

  it("validate bodies", async () => {
    expect((await post(requestsRoute, {})).status).toBe(422);
    expect((await post(respondRoute, { userId: "lan" })).status).toBe(422);
    expect((await post(removeRoute, { userId: "x".repeat(100) })).status).toBe(422);
  });

  it("throttle requests per IP", async () => {
    throttled = true;
    expect((await post(requestsRoute, { userId: "lan" })).status).toBe(429);
  });

  it("answer each refusal in Vietnamese", async () => {
    sendRequest.mockResolvedValue({ ok: false, reason: "notFound" });
    const missing = await post(requestsRoute, { userId: "ghost" });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: { message: "Không tìm thấy người này." } });
    sendRequest.mockResolvedValue({ ok: false, reason: "tooMany" });
    expect((await post(requestsRoute, { userId: "lan" })).status).toBe(409);
    respond.mockResolvedValue({ ok: false, reason: "gone" });
    const gone = await post(respondRoute, { userId: "lan", accept: true });
    expect(gone.status).toBe(404);
    expect(await gone.json()).toEqual({ error: { message: "Lời mời này không còn nữa." } });
  });

  it("answer 503 when the database fails", async () => {
    pulse.mockRejectedValue(new Error("down"));
    expect((await post(pulseRoute)).status).toBe(503);
  });
});
