import {
  ControlGuide,
  DoAvoid,
  GuideSection,
  Intro,
  KeyIdeas,
  ReadMore,
} from "@/components/playground/practice-guide";

export function Explanation() {
  return (
    <>
      <Intro>
        <p>
          This is a hand-built version of what SWR and TanStack Query give you:
          a <code>useQuery</code> hook that fetches data by key and keeps it in
          one shared cache, so every component asking for the same thing gets
          the same answer from a single request.
        </p>
        <p>
          It solves the messy parts of fetching in components: duplicate
          requests, slow responses arriving out of order, data that goes stale,
          flaky networks, and edits that should feel instant but roll back if
          the server says no.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "One cache, many readers", text: "components subscribe to a key; the same key means one request and one value." },
          { title: "Stale-while-revalidate", text: "cached data shows instantly while a background refresh brings it up to date." },
          { title: "Only the latest answer wins", text: "every request carries a token, so a late or cancelled response is thrown away." },
          { title: "Optimistic edits", text: "changes appear everywhere at once and roll back only their own fields on failure." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Master-detail screens: a list of orders or users where opening an item you&apos;ve seen before is instant.</li>
            <li>Dashboards where several widgets read the same data (current user, team, settings) without each fetching it.</li>
            <li>Small edits that should feel immediate: starring, renaming, toggling a setting.</li>
            <li>Apps people leave open for hours, where data should refresh when they come back to the tab.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            One module-level cache holds an entry per key. Keys are hashed with
            object properties sorted, so <code>{"{a,b}"}</code> and{" "}
            <code>{"{b,a}"}</code> are the same key. <code>useQuery</code> reads
            an entry with <code>useSyncExternalStore</code>, and subscribing is
            also how the cache learns who uses what: React mounting, unmounting
            or switching keys drives fetching, cancelling and cleanup. The cache
            lives for the session, so it survives moving between practices.
          </p>
          <p>
            Concurrent readers of a key share one promise. A new request bumps
            the entry&apos;s token and cancelling aborts with an{" "}
            <code>AbortController</code>; a response is only stored if its token
            is still current. Failures retry with growing waits (about 1 s, 2 s,
            4 s, with ±25 % jitter, capped at 30 s), 4xx errors are not retried,
            and requests pause while the browser is offline.
          </p>
          <p>
            When a key loses its last user, its request is cancelled and a
            removal timer starts; a new user cancels the timer. Optimistic edits
            cancel refreshes for the affected keys, remember the old field values,
            write the new ones into the list and the detail, then send the
            request. On failure only the fields that still hold this edit&apos;s
            value are restored, and the last edit to settle refreshes from the
            server.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: "Tag each request and store a response only if it is still the newest one for its key.",
                avoid: "Letting whichever response arrives last win, so a slow old request replaces what the user is looking at.",
              },
              {
                do: "Cancel in-flight refreshes before writing an optimistic value.",
                avoid: "A background refresh landing after the edit and silently putting the old value back.",
              },
              {
                do: "Show cached data with a small “Refreshing” hint, and keep it on screen if the refresh fails.",
                avoid: "Swapping the content for a skeleton on every revisit, or blanking it because a refresh errored.",
              },
              {
                do: "Share one request per key and drop unused entries after a removal time.",
                avoid: "One fetch per component, or a cache that only ever grows during a long session.",
              },
              {
                do: "Retry server and network errors with backoff, and show a clear message with a Retry button at the end.",
                avoid: "Retrying a 404 that will never succeed, or retrying in a tight loop.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Latency", watch: "Slow it to 1500 ms to see skeletons and the “Refreshing” badge. Pick Random and click quickly through users: the detail always ends on the last one you clicked." },
              { control: "Read failure", watch: "Loads fail and retry on their own: watch “Retrying (attempt N)…” and the inspector's “fetching (try N)”. If every attempt fails, an error with a Retry button appears; a failed refresh keeps the old data." },
              { control: "Save failure", watch: "Set it to 100 % and edit a user: the change shows instantly, then rolls back in the list and the detail with a “Couldn't save the change” toast." },
              { control: "Stale time", watch: "At 0 s every revisit shows cached data and refreshes it in the background. At 30 s or Never, revisits make no request until the data turns stale or you invalidate it." },
              { control: "Removal time", watch: "Leave a user and watch its “Removal in” countdown in the inspector. Open it again before it ends and the entry is kept. A new value applies to countdowns that start afterwards." },
              { control: "Retries", watch: "How many retries follow a failed request (0–5). At 0, one failure shows the error straight away." },
              { control: "Refresh on focus / reconnect", watch: "Switch to another tab and back: stale keys in use refresh, at most once every 5 s per key. Untick it and nothing refreshes." },
              { control: "Detail panels (same key)", watch: "Show 2 or 3 panels of one user: the inspector shows several users for that key but a single request, and an edit updates every panel." },
              { control: "Hover a user (prefetch)", watch: "Rest the pointer on a name for 150 ms, or Tab onto it: its detail key appears in the inspector before you click, and opening it shows no loading state." },
              { control: "Favorite star / Display name + Save", watch: "Optimistic edits: the list and detail update at once, the star or Save button is disabled (Save reads “Saving…”) until the server answers, then the keys refresh." },
              { control: "Cache inspector", watch: "One row per key with status, request activity, age, freshness, users, total requests and time until removal. Refresh starts a new request for one key." },
              { control: "Invalidate all / Clear cache", watch: "Invalidate all marks every key stale and refreshes those in use. Clear cache drops everything; keys still on screen start a fresh load." },
              { control: "Ghost User", watch: "Listed but deleted on the server: its detail answers 404 and shows “User not found” straight away, with no retries." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>No Suspense mode: the hook returns status flags and each component renders its own loading and error states.</li>
            <li>No paginated queries, request batching, normalized entities or server-side cache hydration; the cache also doesn&apos;t survive a full reload.</li>
            <li>Rollback is per field, not a full snapshot, so an overlapping edit survives; a failed edit while offline rolls back right away and isn&apos;t queued.</li>
            <li>Known gap: a focus refresh that starts while an edit is still saving can briefly show the server&apos;s old value until the edit&apos;s own refresh lands.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
