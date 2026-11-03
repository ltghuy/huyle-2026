import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
let authBroken = false;
vi.mock("./auth", () => ({
  getAuth: () => {
    // As when the sign-in secrets are missing: building the auth instance throws.
    if (authBroken) throw new Error("Invalid environment variables");
    return { api: { getSession } };
  },
}));

const { getSessionUser, requireUser, SIGN_IN_REQUIRED, SIGN_IN_UNAVAILABLE } = await import("./session");

const request = () => new Request("https://english.huyle.work/api/progress", { headers: { cookie: "a=b" } });
const USER = { id: "u1", name: "Minh Anh", email: "minh@example.com", image: undefined, emailVerified: true };

describe("getSessionUser", () => {
  beforeEach(() => getSession.mockReset());

  it("returns null for a guest", async () => {
    getSession.mockResolvedValue(null);
    expect(await getSessionUser(request())).toBeNull();
  });

  it("returns the signed-in learner, passing the request's headers", async () => {
    getSession.mockResolvedValue({ user: USER, session: {} });
    const req = request();
    expect(await getSessionUser(req)).toEqual({ id: "u1", name: "Minh Anh", email: "minh@example.com", image: null });
    expect(getSession).toHaveBeenCalledWith({ headers: req.headers });
  });
});

describe("requireUser", () => {
  beforeEach(() => getSession.mockReset());

  it("refuses a guest with a Vietnamese 401", async () => {
    getSession.mockResolvedValue(null);
    const result = await requireUser(request());
    if (!("response" in result)) throw new Error("expected a response");
    expect(result.response.status).toBe(401);
    expect(await result.response.json()).toEqual({ error: { message: SIGN_IN_REQUIRED } });
  });

  it("answers 503 when the session can't be checked", async () => {
    authBroken = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await requireUser(request());
    authBroken = false;
    if (!("response" in result)) throw new Error("expected a response");
    expect(result.response.status).toBe(503);
    expect(await result.response.json()).toEqual({ error: { message: SIGN_IN_UNAVAILABLE } });
  });

  it("passes a signed-in learner through", async () => {
    getSession.mockResolvedValue({ user: { ...USER, image: "https://lh3.googleusercontent.com/a" }, session: {} });
    expect(await requireUser(request())).toEqual({
      user: { id: "u1", name: "Minh Anh", email: "minh@example.com", image: "https://lh3.googleusercontent.com/a" },
    });
  });
});
