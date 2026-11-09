import "server-only";
import { cache } from "react";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb, type Db } from "@/server/db";
import { account, session, user, verification } from "@/server/db/schema";
import { getAuthEnv, type AuthEnv } from "@/server/env";

const DAY_SECONDS = 60 * 60 * 24;

/** A session lasts 30 days from the last activity, renewed at most once a day (feature 022, AC-004). */
export const SESSION_EXPIRES_IN = 30 * DAY_SECONDS;
export const SESSION_UPDATE_AGE = DAY_SECONDS;
/** How long a signed session cookie answers without a D1 read; also how long a deleted account's cookie can still work. */
export const SESSION_COOKIE_CACHE = 5 * 60;

/**
 * Better Auth for Google sign-in. Every value is passed explicitly: Better Auth's own env reader
 * only looks at `process.env`, and this app keeps secrets in the Cloudflare bindings.
 */
export function authOptions(env: AuthEnv, db: Db) {
  return {
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    // D1 has no interactive transactions; the adapter's `transaction` defaults to false.
    database: drizzleAdapter(db, { provider: "sqlite", schema: { user, session, account, verification } }),
    socialProviders: {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: "select_account" },
    },
    session: {
      expiresIn: SESSION_EXPIRES_IN,
      updateAge: SESSION_UPDATE_AGE,
      cookieCache: { enabled: true, maxAge: SESSION_COOKIE_CACHE },
    },
    user: {
      additionalFields: {
        // Set by the progress sync from the learner's "Gửi thống kê ẩn danh" setting (AC-028), never by the client directly.
        statsOptOut: { type: "boolean", defaultValue: false, input: false },
        // Shows the "Quản trị" link (feature 038). Never input; the admin routes re-read it from D1.
        isAdmin: { type: "boolean", defaultValue: false, input: false },
      },
    },
    // Must be last: it lets the auth API set cookies from route handlers.
    plugins: [nextCookies()],
  } satisfies BetterAuthOptions;
}

/** Built once per request, because the D1 binding and secrets only exist inside a request. */
export const getAuth = cache(() => betterAuth(authOptions(getAuthEnv(), getDb())));

export type Auth = ReturnType<typeof getAuth>;
