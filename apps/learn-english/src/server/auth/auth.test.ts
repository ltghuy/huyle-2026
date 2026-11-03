// @vitest-environment node
import { describe, expect, it } from "vitest";
import { betterAuth } from "better-auth";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { authOptions, SESSION_COOKIE_CACHE, SESSION_EXPIRES_IN, SESSION_UPDATE_AGE } from "./auth";

const ENV = {
  BETTER_AUTH_SECRET: "s".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3002",
  GOOGLE_CLIENT_ID: "id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "secret",
};

describe("authOptions", () => {
  it("keeps a session 30 days from the last activity, renewed daily, with a 5-minute cookie cache", () => {
    const { session } = authOptions(ENV, sqliteDb().db);
    expect(SESSION_EXPIRES_IN).toBe(30 * 24 * 60 * 60);
    expect(SESSION_UPDATE_AGE).toBe(24 * 60 * 60);
    expect(session).toEqual({ expiresIn: SESSION_EXPIRES_IN, updateAge: SESSION_UPDATE_AGE, cookieCache: { enabled: true, maxAge: SESSION_COOKIE_CACHE } });
  });

  it("offers Google only, asking which account to use", () => {
    const options = authOptions(ENV, sqliteDb().db);
    expect(Object.keys(options.socialProviders)).toEqual(["google"]);
    expect(options.socialProviders.google).toEqual({ clientId: ENV.GOOGLE_CLIENT_ID, clientSecret: ENV.GOOGLE_CLIENT_SECRET, prompt: "select_account" });
    expect(options).not.toHaveProperty("emailAndPassword");
  });

  it("takes the base URL and secret from the bindings, not process.env", () => {
    const options = authOptions(ENV, sqliteDb().db);
    expect(options.baseURL).toBe("http://localhost:3002");
    expect(options.secret).toBe(ENV.BETTER_AUTH_SECRET);
  });
});

describe("Better Auth over the app's tables", () => {
  it("answers a request without a session cookie with no session", async () => {
    const auth = betterAuth(authOptions(ENV, sqliteDb().db));
    expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
  });

  it("starts a Google sign-in pointing back at the app's callback", async () => {
    const auth = betterAuth(authOptions(ENV, sqliteDb().db));
    const response = await auth.handler(
      new Request("http://localhost:3002/api/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3002" },
        body: JSON.stringify({ provider: "google", callbackURL: "/grammar" }),
      }),
    );
    expect(response.status).toBe(200);
    const { url } = (await response.json()) as { url: string };
    const google = new URL(url);
    expect(google.origin).toBe("https://accounts.google.com");
    expect(google.searchParams.get("redirect_uri")).toBe("http://localhost:3002/api/auth/callback/google");
    expect(google.searchParams.get("prompt")).toBe("select_account");
  });
});
