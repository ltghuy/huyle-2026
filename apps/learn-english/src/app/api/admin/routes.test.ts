import { beforeEach, describe, expect, it, vi } from "vitest";

// Feature 038: every admin route refuses guests and learners who aren't admins (AC-003).

let access: "admin" | "learner" | "guest" = "admin";
vi.mock("@/server/admin/request", async (original) => {
  const real = await original<typeof import("@/server/admin/request")>();
  return {
    ...real,
    requireAdmin: async () =>
      access === "admin"
        ? { user: { id: "boss", name: "Boss", email: "b@example.com", image: null } }
        : { response: real.error(access === "guest" ? "Bạn cần đăng nhập để tiếp tục." : "Bạn không có quyền vào trang này.", access === "guest" ? 401 : 403) },
  };
});
vi.mock("@/server/db", () => ({ getDb: () => ({}) }));
const services = vi.hoisted(() => ({
  getOverview: vi.fn(async () => ({ range: "today" })),
  listClaimGroups: vi.fn(async () => []),
  decideClaims: vi.fn(async () => ({ ok: true, changed: 1 })),
  listContent: vi.fn(async () => ({ items: [], total: 0, page: 1 })),
  getContentItem: vi.fn(async () => null),
  saveContentItem: vi.fn(async () => ({ ok: false, reason: "invalid", issues: [{ path: "body.en", message: "Required" }] })),
  setContentRemoved: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/server/admin/overview.service", () => ({ getOverview: services.getOverview }));
vi.mock("@/server/admin/claims.service", () => ({ listClaimGroups: services.listClaimGroups, decideClaims: services.decideClaims }));
vi.mock("@/server/admin/content.service", () => ({ listContent: services.listContent, getContentItem: services.getContentItem, saveContentItem: services.saveContentItem, setContentRemoved: services.setContentRemoved }));

const overview = await import("./overview/route");
const claims = await import("./claims/route");
const decide = await import("./claims/decide/route");
const content = await import("./content/route");
const item = await import("./content/item/route");
const remove = await import("./content/remove/route");

const url = (path: string) => `https://english.huyle.work/api/admin/${path}`;
const get = (route: { GET: (r: Request) => Promise<Response> }, path: string) => route.GET(new Request(url(path)));
const post = (route: { POST: (r: Request) => Promise<Response> }, body: unknown) =>
  route.POST(new Request(url("x"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

const calls = () => [
  get(overview, "overview"),
  get(claims, "claims"),
  post(decide, { ids: ["c1"], decision: "drop" }),
  get(content, "content"),
  get(item, "content/item?id=word:a"),
  post(item, { create: false, item: { id: "word:a", kind: "word", level: "A1", body: {} } }),
  post(remove, { id: "word:a", removed: true }),
];

beforeEach(() => {
  access = "admin";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("admin routes (feature 038)", () => {
  it("refuse guests with 401 and learners with 403, never calling a service", async () => {
    for (const who of ["guest", "learner"] as const) {
      access = who;
      for (const response of await Promise.all(calls())) expect(response.status).toBe(who === "guest" ? 401 : 403);
    }
    for (const service of Object.values(services)) expect(service).not.toHaveBeenCalled();
  });

  it("are never cached", async () => {
    for (const response of await Promise.all(calls())) expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("validate input", async () => {
    expect((await get(overview, "overview?range=year")).status).toBe(422);
    expect((await post(decide, { ids: ["c1"], decision: "reject" })).status).toBe(422);
    expect((await get(item, "content/item")).status).toBe(422);
  });

  it("pass an invalid item's problems back with 422", async () => {
    const response = await post(item, { create: false, item: { id: "word:a", kind: "word", level: "A1", body: {} } });
    expect(response.status).toBe(422);
    expect(((await response.json()) as { error: { issues: unknown } }).error.issues).toEqual([{ path: "body.en", message: "Required" }]);
  });
});
