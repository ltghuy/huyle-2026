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
          Search-as-you-type that stays fast and correct on a real network:
          wait for a pause before searching, reuse recent results, cancel
          requests nobody needs any more, and never let a slow, older
          response overwrite a newer one. Type (or let the robot type), watch
          the request timeline, then switch each technique off to see the bug
          it prevents.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "Debounce", text: "search once input has been quiet for ~300 ms, not on every keystroke; Enter skips the wait." },
          { title: "Normalize, then cache", text: "“Café  Mug ” and “cafe mug” are one key; recent keys are answered from memory, stale ones refreshed in the background." },
          { title: "Responses arrive out of order", text: "abort superseded requests to save work, and guard with a run id so only the latest search may change the screen." },
          { title: "Show what you're showing", text: "label results with their query, keep them visible but dimmed while the next one loads." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Search boxes, autocomplete, address and user pickers, command palettes.</li>
            <li>Filters that refetch as you change them (price sliders, faceted search).</li>
            <li>Any input-driven request where the user changes their mind faster than the server answers.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            A framework-free <code>SearchEngine</code> owns the whole pattern;
            React subscribes with <code>useSyncExternalStore</code> and only
            forwards events, so the typing robot and real keystrokes take the
            same path. <code>setInput</code> normalizes the text with the same
            function the server uses (trim, collapse spaces, lowercase, strip
            accents, 100 characters). If the key didn&apos;t change, nothing
            happens; if it&apos;s shorter than the minimum, pending work is
            cancelled and the list cleared; otherwise a trailing timer is
            (re)started. A keystroke that resets the timer logs the cancelled
            wait as <em>debounced</em>. One shortcut: when the cache already
            holds a fresh answer for the key, there is nothing to save by
            waiting, so it is shown on that keystroke.
          </p>
          <p>
            When the timer fires (or on Enter), <code>run</code> increments a{" "}
            <strong>run id</strong>. If a request for the same key is already in
            flight it is adopted instead of sent twice. Otherwise the cache is
            asked: fresh → shown instantly, no request; stale → shown at once
            with “refreshing…” while a background request revalidates it
            (stale-while-revalidate); miss → a request with its own{" "}
            <code>AbortController</code>. Starting a run aborts the older
            in-flight requests, and the mock API stops its delay when{" "}
            <code>request.signal</code> aborts. When a response settles it is
            written to the cache (even if it is no longer wanted: it is correct
            data for its key), then applied only if its run id is still the
            current one; otherwise it is logged as <em>stale, dropped</em>.
          </p>
          <p>
            The cache is a module-level <code>Map</code>: re-inserting on every
            read keeps it in least-recently-used order, so eviction drops the
            first key. Entries are fresh for 30 s, usable but stale up to 5
            minutes, at most 20; errors are never cached. The listbox follows
            the WAI-ARIA combobox pattern: focus stays in the input,{" "}
            <code>aria-activedescendant</code> names the highlighted option, and
            a polite status line announces results only when a search settles.
            The latest query is mirrored into <code>?q=</code> with{" "}
            <code>history.replaceState</code>, so a link restores it without
            adding a history entry per keystroke.
          </p>
          <p>
            Practice 4&apos;s <code>useQuery</code> is a general server-state
            cache (observers, dedupe, retries, focus refetch, garbage
            collection) keyed by arbitrary keys. This practice builds the
            narrower thing a search box needs on top of the same ideas:
            per-keystroke scheduling, key normalization, an LRU bound for many
            short-lived keys, and the &quot;latest search wins&quot; rule, which a
            general cache doesn&apos;t know about because it doesn&apos;t know
            which key the screen currently wants.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: "Debounce input-driven requests (trailing edge, ~250–400 ms) and let Enter search immediately.",
                avoid: "Fetching on every keystroke, or throttling: throttle fires mid-word at a fixed rate; debounce waits for the pause.",
              },
              {
                do: "Decide which response may update the screen by comparing a run id (or the current key) when it arrives.",
                avoid: "setResults(await fetch(...)) in an effect: whichever request finishes last wins, even if it's the oldest.",
              },
              {
                do: "Abort superseded requests with AbortController, and treat aborts as silent, not as errors.",
                avoid: "Relying on abort alone for correctness: a response can already be resolved, and some sources can't be aborted.",
              },
              {
                do: "Normalize queries before using them as cache keys, and bound the cache (TTL + size).",
                avoid: "Keying by raw text (“Lamp”, “lamp ”) or caching forever: duplicate entries and unbounded memory.",
              },
              {
                do: "Keep previous results visible (dimmed, labelled with their query) while the next ones load.",
                avoid: "Clearing the list on every keystroke: the page flickers and jumps.",
              },
              {
                do: "Announce settled results in a polite live region; keep focus in the input with aria-activedescendant.",
                avoid: "Moving DOM focus into the list, or announcing every intermediate state.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Typing robot", watch: "Types the phrase at a steady rate. Fast (50 ms per key) with debounce on: 1 request and the rest “Debounced”. Slow (400 ms per key): every key outlasts the delay, so you see requests being aborted." },
              { control: "All off (naive)", watch: "With “Shorter queries slower”, let the robot type: 7 requests whose bars finish out of order, and often a warning that the list shows results for an older, shorter query (“de”, “des”). Run it a few times: the order is random." },
              { control: "Stale-response guard", watch: "Turn only this off and abort off too: the bug comes back. Abort alone usually hides it, because aborted requests never resolve." },
              { control: "Cache", watch: "Search “lamp”, then “lamps”, then delete the s: “Cache hit”, no request. Set fresh time to 5 s and wait: the next hit shows “refreshing…” and a Refresh row." },
              { control: "Cache size", watch: "At 5 entries, search six different queries: the least recently used one disappears from the inspector." },
              { control: "Debounce delay / Minimum length", watch: "0 ms behaves like debounce off. Minimum 1 lets single letters search (expensive, mostly noise)." },
              { control: "Server latency / Random extra", watch: "More randomness means more overlapping bars and more aborted or dropped responses." },
              { control: "Failure rate", watch: "The latest failure shows an error with Retry (straight to the network); older failures are dropped silently." },
              { control: "Keyboard", watch: "↓/↑ move through results, Enter picks, Escape hides the list, a second Escape clears the box." },
              { control: "URL", watch: "Search, then reload: the query comes back from ?q= and runs immediately; Back leaves the page instead of stepping through queries." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>Debounce adds its delay to every search; a smaller delay or a leading-edge first search feels faster but sends more requests.</li>
            <li>The cache lives in memory for this tab: it survives navigating within the app, not a reload, and results can be up to the fresh time out of date.</li>
            <li>Normalization keeps word order (“desk lamp” and “lamp desk” are two keys with identical results); sorting words would merge them.</li>
            <li>The run-id guard drops a slower response even when it would have been fine to show; it trades a few wasted responses for never being wrong.</li>
            <li>Matching is “every word starts a word”, ranked by starts-with then name; real search needs typo tolerance and relevance ranking on the server.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
