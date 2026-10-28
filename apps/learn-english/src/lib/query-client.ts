import { QueryClient } from "@tanstack/react-query";

// In-memory cache shared by every screen for one visit (feature 005). It sits
// on top of the browser copies: content stays in IndexedDB with its version
// (`src/content/client.ts`), progress in its stores (`src/storage/*`).

/** Query keys of course content; invalidating it reloads every content query. */
export const CONTENT_KEY = ["content"] as const;
/** Query keys of data read from the progress stores. */
export const STORAGE_KEY = ["storage"] as const;

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Content refreshes on a new publish and progress on change messages
        // (see QueryProvider), so neither needs TanStack's own triggers.
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // Storage reads don't fail for network reasons, and content already
        // falls back to the last download, so a failure is shown at once.
        retry: false,
      },
    },
  });
}
