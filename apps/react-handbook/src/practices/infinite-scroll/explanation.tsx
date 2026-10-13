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
          Infinite scroll loads the next page of a long list as the reader nears
          its end, so they can keep reading without clicking through pages. The
          harder parts are firing only one request at a time, showing each post
          exactly once when new posts arrive, and keeping the text someone is
          reading in place.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "An observer triggers loading", text: <>an <code>IntersectionObserver</code> watches a marker after the last post; no scroll handler decides when to load.</> },
          { title: "One request at a time", text: "a ref blocks a second request before React state could." },
          { title: "Cursor paging", text: "new posts never shift older pages, so nothing is duplicated or skipped." },
          { title: "Content stays in place", text: "pages only append below; new posts wait behind a pill until you ask." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Social and news feeds, where people browse rather than look for one item.</li>
            <li>Activity logs and notification histories that grow over time.</li>
            <li>Image or product grids for casual browsing, paired with a “Load more” fallback.</li>
            <li>Search results that are skimmed in order, when there&apos;s no footer people need to reach.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            The feed scrolls inside its own fixed-height box. An{" "}
            <code>IntersectionObserver</code> uses that box as its root and the
            trigger distance as a bottom <code>rootMargin</code>, so it fires
            when the end marker comes within that distance. A ref is checked and
            set synchronously before every request, because React state updates
            too late to stop a second trigger. The observer is re-created each
            time loading settles, so short pages keep loading until the box can
            scroll.
          </p>
          <p>
            The server returns an opaque “older than post #N” cursor instead of a
            page number. New posts get higher numbers, so they never shift older
            pages. A timer checks for newer posts in the background (skipped
            while the tab is hidden); they wait behind a pill and go to the top
            only when you press it.
          </p>
          <p>
            Posts, cursor and the first visible post with its pixel offset are
            kept in module memory. Coming back to the practice restores them in
            a layout effect before paint, with no new requests. Leaving aborts
            any request still in flight.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: <>Use an <code>IntersectionObserver</code> with a <code>rootMargin</code> so the next page starts loading before the end.</>,
                avoid: "Measuring positions in a scroll handler on every scroll event.",
              },
              {
                do: "Guard requests with a ref that is set synchronously, and abort them when the reader leaves.",
                avoid: "Relying on a loading state alone: fast scrolling fires the same page twice.",
              },
              {
                do: "Page with a cursor from the server and drop any post already in the list.",
                avoid: "Offset or page-number paging on data that changes: inserts cause duplicates and gaps.",
              },
              {
                do: <>Mark the list as a <code>role=&quot;feed&quot;</code> of focusable <code>article</code>s with <code>aria-posinset</code>/<code>aria-setsize</code>, announce progress politely, and keep a visible Load more button.</>,
                avoid: "A feed that only grows by scrolling a mouse wheel, with nothing announced.",
              },
              {
                do: "Append below and hold new posts until the reader asks for them.",
                avoid: "Inserting content above the reader, which pushes what they are reading out of view.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Latency", watch: "Slows each page request. Scroll fast: the stats line still shows one request per page and a single “Loading more posts…” row." },
              { control: "Failure rate", watch: "Page requests fail at random. Automatic loading pauses on an error and waits for you to press Retry." },
              { control: "Page size", watch: "Applies from the next request, mid-feed too: the list continues with no post repeated or skipped." },
              { control: "Trigger distance", watch: "How early the next page loads. At 0 px it waits until the very end; at 1200 px it loads well ahead." },
              { control: "Check every", watch: "How often the feed checks the server for newer posts, from 5 to 60 seconds." },
              { control: "Simulate new posts", watch: "Creates 3 posts on the server. After the next check, a pill appears and the list doesn't move." },
              { control: "New posts pill", watch: "Shows the count (capped at “99+”). Pressing it inserts the posts at the top and scrolls there." },
              { control: "Load more / Retry", watch: "Loads the next page by hand, or after an error. At the end it becomes “You've reached the end · N posts”." },
              { control: "Back to top", watch: "Appears once you scroll more than two box heights down; it returns to the top and focuses the first post." },
              { control: "Page Down / Page Up", watch: "With a post focused, moves focus to the next or previous post." },
              { control: "Reset feed", watch: "Clears the saved feed and position, then loads the first page again." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>Every loaded post stays in the page: no windowing, so very long sessions grow the DOM (the virtualized list practice covers that).</li>
            <li>Loads only downward; two-way scrolling and real-time push belong to the chat practice. New posts arrive by polling.</li>
            <li>The feed and position survive in-app navigation but not a full reload, and demo control values reset when you leave.</li>
            <li>After a failed page, automatic loading waits for Retry instead of retrying with backoff.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
