// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { LINK_CODE } from "@/learning/arena/link";
import { handleArenaSocket, LINK_SOCKET_PATH, PLAYER_HEADER, SOCKET_MESSAGES } from "./socket-route";
import { signTicket } from "./ticket";

const SECRET = "s".repeat(32);
const NOW = 1_800_000_000_000;
const MINH = { uid: "minh", name: "Minh Anh", image: null, code: "K7P2QX" };

function upgrade(path: string, protocol?: string, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { Upgrade: "websocket", ...extra };
  if (protocol) headers["Sec-WebSocket-Protocol"] = protocol;
  return new Request(`https://english.huyle.work${path}`, { headers });
}

type Bindings = Parameters<typeof handleArenaSocket>[1];

function env(fetch = vi.fn<(request: Request) => Promise<Response>>(async () => new Response("to the room"))) {
  const getByName = vi.fn(() => ({ fetch }));
  const room = { getByName } as unknown as Bindings["ARENA_ROOM"];
  const linkFetch = vi.fn<(request: Request) => Promise<Response>>(async () => new Response("to the link"));
  const linkByName = vi.fn(() => ({ fetch: linkFetch }));
  const link = { getByName: linkByName } as unknown as Bindings["LEARNER_LINK"];
  return { env: { ARENA_ROOM: room, LEARNER_LINK: link, ARENA_SECRET: SECRET } as Bindings, room, getByName, fetch, linkByName, linkFetch };
}

describe("handleArenaSocket", () => {
  it("leaves every other path to Next.js", async () => {
    expect(await handleArenaSocket(new Request("https://english.huyle.work/arena"), env().env, NOW)).toBeNull();
  });

  it("forwards a ticketed socket to its room with the ticket's identity, not the browser's", async () => {
    const ticket = await signTicket(MINH, SECRET, NOW);
    const { env: bindings, getByName, fetch } = env();
    const response = await handleArenaSocket(
      upgrade("/api/arena/socket?code=K7P2QX", `arena, ${ticket}`, { [PLAYER_HEADER]: JSON.stringify({ id: "lan", name: "Lan" }) }),
      bindings,
      NOW,
    );
    expect(await response!.text()).toBe("to the room");
    expect(getByName).toHaveBeenCalledWith("K7P2QX");
    const forwarded = fetch.mock.calls[0][0];
    expect(JSON.parse(forwarded.headers.get(PLAYER_HEADER)!)).toEqual({ id: "minh", name: "Minh Anh", image: null });
    expect(forwarded.headers.get("Sec-WebSocket-Protocol")).toBeNull();
  });

  it("asks for a WebSocket", async () => {
    const response = await handleArenaSocket(new Request("https://english.huyle.work/api/arena/socket?code=K7P2QX"), env().env, NOW);
    expect(response!.status).toBe(426);
  });

  it("refuses a malformed room code", async () => {
    for (const code of ["", "k7p2qx", "K7P2Q", "K7P2Q0", "K7P2QXX"]) {
      expect((await handleArenaSocket(upgrade(`/api/arena/socket?code=${code}`, "arena, x"), env().env, NOW))!.status).toBe(400);
    }
  });

  it("refuses a missing, expired or foreign ticket with 401", async () => {
    const { env: bindings, fetch } = env();
    expect((await handleArenaSocket(upgrade("/api/arena/socket?code=K7P2QX"), bindings, NOW))!.status).toBe(401);
    const ticket = await signTicket(MINH, SECRET, NOW);
    expect((await handleArenaSocket(upgrade("/api/arena/socket?code=K7P2QX", `arena, ${ticket}`), bindings, NOW + 60_000))!.status).toBe(401);
    expect((await handleArenaSocket(upgrade("/api/arena/socket?code=ABCDEF", `arena, ${ticket}`), bindings, NOW))!.status).toBe(401);
    expect((await handleArenaSocket(upgrade("/api/arena/socket?code=K7P2QX", ticket), bindings, NOW))!.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers 503 in Vietnamese when the secret is missing or the room can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const ticket = await signTicket(MINH, SECRET, NOW);
    const noSecret = await handleArenaSocket(upgrade("/api/arena/socket?code=K7P2QX", `arena, ${ticket}`), { ARENA_ROOM: env().room } as Bindings, NOW);
    expect(noSecret!.status).toBe(503);
    expect(await noSecret!.text()).toBe(SOCKET_MESSAGES.unavailable);

    const failing = env(
      vi.fn<(request: Request) => Promise<Response>>(async () => {
        throw new Error("Exceeded allowed requests");
      }),
    );
    const down = await handleArenaSocket(upgrade("/api/arena/socket?code=K7P2QX", `arena, ${ticket}`), failing.env, NOW);
    expect(down!.status).toBe(503);
  });

  it("forwards a link socket to the learner's own link (feature 035)", async () => {
    const ticket = await signTicket({ ...MINH, code: LINK_CODE }, SECRET, NOW);
    const { env: bindings, linkByName, linkFetch, fetch } = env();
    const response = await handleArenaSocket(upgrade(LINK_SOCKET_PATH, `arena, ${ticket}`), bindings, NOW);
    expect(await response!.text()).toBe("to the link");
    expect(linkByName).toHaveBeenCalledWith("minh");
    expect(JSON.parse(linkFetch.mock.calls[0][0].headers.get(PLAYER_HEADER)!).id).toBe("minh");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never lets a room ticket open a link, or a link ticket a room", async () => {
    const { env: bindings, linkFetch, fetch } = env();
    const roomTicket = await signTicket(MINH, SECRET, NOW);
    expect((await handleArenaSocket(upgrade(LINK_SOCKET_PATH, `arena, ${roomTicket}`), bindings, NOW))!.status).toBe(401);
    const linkTicket = await signTicket({ ...MINH, code: LINK_CODE }, SECRET, NOW);
    expect((await handleArenaSocket(upgrade("/api/arena/socket?code=K7P2QX", `arena, ${linkTicket}`), bindings, NOW))!.status).toBe(401);
    expect(linkFetch).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
