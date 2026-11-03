// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sqliteDb } from "@/test-utils/sqlite-d1";

const NOW = Date.parse("2026-11-03T10:00:00Z");
let signedIn = true;
const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db", () => ({ getDb: () => holder.db }));
vi.mock("@/server/auth/session", () => ({
  requireUser: async () =>
    signedIn
      ? { user: { id: "u1", name: "Minh Anh", email: "minh@example.com", image: null } }
      : { response: Response.json({ error: { message: "Bạn cần đăng nhập để tiếp tục." } }, { status: 401 }) },
}));
const signOut = vi.fn(async () => new Response(null, { headers: [["Set-Cookie", "better-auth.session_token=; Max-Age=0"], ["Set-Cookie", "better-auth.session_data=; Max-Age=0"]] }));
vi.mock("@/server/auth/auth", () => ({ getAuth: () => ({ api: { signOut } }) }));

const { DELETE } = await import("./route");
let sqlite: ReturnType<typeof sqliteDb>["sqlite"];

beforeEach(() => {
  signedIn = true;
  const fresh = sqliteDb();
  holder.db = fresh.db;
  sqlite = fresh.sqlite;
  sqlite.exec(`
    INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('u1', 'Minh Anh', 'minh@example.com', ${NOW}, ${NOW});
    INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('u2', 'Lan', 'lan@example.com', ${NOW}, ${NOW});
    INSERT INTO session (id, user_id, token, expires_at, created_at, updated_at) VALUES ('s1', 'u1', 't1', ${NOW}, ${NOW}, ${NOW});
    INSERT INTO account_progress (user_id, data, rev, size, created_at, updated_at) VALUES ('u1', x'00', 1, 1, ${NOW}, ${NOW});
  `);
});

const count = (sql: string) => (sqlite.prepare(sql).get() as { n: number }).n;
const request = () => new Request("https://english.huyle.work/api/account", { method: "DELETE" });

describe("DELETE /api/account (022 AC-023)", () => {
  it("deletes the signed-in learner's account and progress, and clears the session cookies", async () => {
    const response = await DELETE(request());
    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie()).toEqual(["better-auth.session_token=; Max-Age=0", "better-auth.session_data=; Max-Age=0"]);
    expect(count("SELECT COUNT(*) AS n FROM user WHERE id = 'u1'")).toBe(0);
    expect(count("SELECT COUNT(*) AS n FROM session")).toBe(0);
    expect(count("SELECT COUNT(*) AS n FROM account_progress")).toBe(0);
    expect(count("SELECT COUNT(*) AS n FROM user WHERE id = 'u2'")).toBe(1);
  });

  it("refuses a guest", async () => {
    signedIn = false;
    expect((await DELETE(request())).status).toBe(401);
    expect(count("SELECT COUNT(*) AS n FROM user")).toBe(2);
  });
});
