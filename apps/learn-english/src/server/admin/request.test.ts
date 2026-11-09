// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sqliteDb } from "@/test-utils/sqlite-d1";

let signedIn: string | null = "boss";
vi.mock("@/server/auth/session", () => ({
  requireUser: async () =>
    signedIn ? { user: { id: signedIn, name: "X", email: "x@example.com", image: null } } : { response: Response.json({ error: { message: "Bạn cần đăng nhập để tiếp tục." } }, { status: 401 }) },
}));
vi.mock("@/server/db", () => ({ getDb: () => ({}) }));

const { requireAdmin } = await import("./request");
const request = () => new Request("https://english.huyle.work/api/admin/overview");

let handle: ReturnType<typeof sqliteDb>;
beforeEach(() => {
  handle = sqliteDb();
  handle.sqlite.exec(`INSERT INTO user (id, name, email, created_at, updated_at, is_admin) VALUES ('boss', 'Boss', 'b@example.com', 1, 1, 1), ('lan', 'Lan', 'l@example.com', 1, 1, 0)`);
});

describe("requireAdmin (feature 038, AC-003)", () => {
  it("refuses guests with 401", async () => {
    signedIn = null;
    const result = await requireAdmin(request(), handle.db);
    expect("response" in result && result.response.status).toBe(401);
  });

  it("refuses a signed-in learner who isn't an admin with 403 in Vietnamese", async () => {
    signedIn = "lan";
    const result = await requireAdmin(request(), handle.db);
    expect("response" in result && result.response.status).toBe(403);
    if ("response" in result) expect(((await result.response.json()) as { error: { message: string } }).error.message).toBe("Bạn không có quyền vào trang này.");
  });

  it("lets an admin through, and reads the flag fresh each time", async () => {
    signedIn = "boss";
    expect("user" in (await requireAdmin(request(), handle.db))).toBe(true);
    handle.sqlite.exec("UPDATE user SET is_admin = 0 WHERE id = 'boss'");
    expect("response" in (await requireAdmin(request(), handle.db))).toBe(true);
  });
});
