// @vitest-environment node
import { describe, expect, it } from "vitest";
import { signTicket, TICKET_TTL_MS, verifyTicket } from "./ticket";

const SECRET = "s".repeat(32);
const NOW = 1_800_000_000_000;
const MINH = { uid: "minh", name: "Minh Anh", image: null, code: "K7P2QX" };

describe("room tickets", () => {
  it("round-trips the player's identity for the room it was issued for", async () => {
    const ticket = await signTicket(MINH, SECRET, NOW);
    expect(await verifyTicket(ticket, SECRET, "K7P2QX", NOW + 1_000)).toEqual({ ...MINH, exp: NOW + TICKET_TTL_MS });
  });

  it("keeps Vietnamese names and avatar URLs intact", async () => {
    const lan = { uid: "lan", name: "Nguyễn Thị Lan", image: "https://lh3.googleusercontent.com/a/x=s96-c", code: "K7P2QX" };
    expect(await verifyTicket(await signTicket(lan, SECRET, NOW), SECRET, "K7P2QX", NOW)).toMatchObject(lan);
  });

  it("refuses an expired ticket", async () => {
    const ticket = await signTicket(MINH, SECRET, NOW);
    expect(await verifyTicket(ticket, SECRET, "K7P2QX", NOW + TICKET_TTL_MS)).toBeNull();
  });

  it("refuses a ticket for another room", async () => {
    const ticket = await signTicket(MINH, SECRET, NOW);
    expect(await verifyTicket(ticket, SECRET, "ZZZZZZ", NOW)).toBeNull();
  });

  it("refuses a tampered ticket or one signed with another secret", async () => {
    const ticket = await signTicket(MINH, SECRET, NOW);
    const [payload, signature] = ticket.split(".");
    const forged = btoa(JSON.stringify({ ...MINH, uid: "lan", exp: NOW + TICKET_TTL_MS })).replace(/=+$/, "");
    expect(await verifyTicket(`${forged}.${signature}`, SECRET, "K7P2QX", NOW)).toBeNull();
    expect(await verifyTicket(`${payload}.${signature.slice(0, -2)}AA`, SECRET, "K7P2QX", NOW)).toBeNull();
    expect(await verifyTicket(ticket, "t".repeat(32), "K7P2QX", NOW)).toBeNull();
  });

  it("refuses malformed tickets", async () => {
    for (const bad of ["", "abc", "a.b.c", "!!!.???"]) expect(await verifyTicket(bad, SECRET, "K7P2QX", NOW)).toBeNull();
  });

  it("refuses to sign with a short secret", async () => {
    await expect(signTicket(MINH, "short", NOW)).rejects.toThrow("ARENA_SECRET");
  });
});
