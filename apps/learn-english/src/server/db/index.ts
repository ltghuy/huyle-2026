import "server-only";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Bindings only exist inside a request, so the client is built per request
// (and shared within it through React's cache). Never call this at module scope.
export const getDb = cache(() => drizzle(getCloudflareContext().env.DB, { schema }));

export type Db = ReturnType<typeof getDb>;
