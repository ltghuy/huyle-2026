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
          A live board of tens of thousands of rows is where “React is slow”
          comes from, and the fix is never one trick. Measure first, find the
          wasted work (rows nobody can see, rows that didn&apos;t change, the
          same sort on every render, typing that waits for the list, lookups
          that scan the whole list), then remove each cause. Switch the five
          optimizations on and off, watch the measurements, and run the
          benchmark to compare configurations with numbers.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "Render time ≈ rows rendered × cost per row", text: "windowing cuts the first factor, memoized rows cut how many re-render per update." },
          { title: "memo needs stable props", text: "a new callback or object per render, or an in-place mutation, silently turns it off." },
          { title: "Keep typing urgent", text: "a deferred filter lets the input paint first and the board catch up in an interruptible render." },
          { title: "Measure, don't guess", text: "render time, rows re-rendered, typing delay, long tasks and frames tell you which fix matters." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Trading screens, monitoring dashboards, logs and live tables with frequent updates.</li>
            <li>Admin lists that grew from hundreds to tens of thousands of rows.</li>
            <li>Any screen where profiling shows long renders or a laggy input.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            The board&apos;s data, filter, sort and selection are ordinary React
            state, because the techniques here are React rendering techniques.
            The measurements are not: a module-level store records numbers and
            the panel reads it four times a second, so measuring never
            re-renders the board. Render time runs from the event that caused
            the update (a keystroke, click, scroll or feed update) to the first
            layout effect after the commit, which includes filtering, rendering
            and DOM updates. React&apos;s <code>&lt;Profiler&gt;</code> would be
            the usual tool, but its callback doesn&apos;t run in production
            builds unless you ship the profiling build (<code>next build --profile</code>).
            Each row render bumps a counter (“rows re-rendered”); typing delay
            is keydown to the next painted frame; a{" "}
            <code>PerformanceObserver</code> counts long tasks (over 50 ms) and
            their blocking time; a <code>requestAnimationFrame</code> loop
            counts frames.
          </p>
          <p>
            <strong>Windowing</strong>: rows are 36 px, so the rows to render
            are <code>floor(scrollTop / 36)</code> plus what fits in the
            viewport, with 8 extra on each side, positioned inside a spacer as
            tall as the whole list. Fixed heights make this constant-time;
            practice 7 handles rows of different heights.{" "}
            <strong>Memoized rows</strong>: rows are wrapped in{" "}
            <code>memo</code>, receive the instrument object (whose identity
            changes only when it&apos;s updated), a <code>selected</code>{" "}
            boolean and a <code>useCallback</code> handler; feed updates replace
            only the changed objects. With it off, rows are plain components
            given a fresh arrow function each render, the usual naive code.{" "}
            <strong>Cached filter and sort</strong>: <code>useMemo</code> over
            data, filter and sort; note that it can&apos;t help when the data
            itself changed, so with a sort active every feed update still
            re-sorts. <strong>Deferred filtering</strong>:{" "}
            <code>useDeferredValue(query)</code> feeds the board, so a keystroke
            first renders with the old query (the memoized board skips) and the
            new filter renders in the background. <strong>Indexed updates</strong>:
            a feed update names instruments by id; a <code>Map</code> from id to
            position finds each in O(1), where <code>findIndex</code> scans the
            list for every changed row.
          </p>
          <p>
            Two guards keep the naive version usable: turning windowing off
            above 20,000 rows asks first (with the playground&apos;s shared
            confirm dialog), and any update slower than one second pauses the
            feed. The benchmark replays the same seeded scenario through the
            same handlers as you, so its numbers compare configurations, not
            luck.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: "Profile first (React DevTools Profiler, the Performance panel), then fix the biggest cost.",
                avoid: "Sprinkling memo and useMemo everywhere: they cost memory and comparisons and often don't help.",
              },
              {
                do: "Window long lists, so render cost depends on the viewport, not the data size.",
                avoid: "Rendering thousands of rows “because it's only text”: each row is several DOM nodes and a component render.",
              },
              {
                do: "Update immutably and pass stable props (useCallback, primitives) to memoized rows.",
                avoid: "onSelect={() => select(row.id)} or style={{...}} on a memo row: a new prop every render, so it always re-renders.",
              },
              {
                do: "Keep typing urgent with useDeferredValue or startTransition, and memoize the expensive subtree.",
                avoid: "Deferring the value but rendering the heavy list anyway in the urgent render: nothing gets faster.",
              },
              {
                do: "Index by id (Map) when applying many updates to a large list.",
                avoid: "list.find / findIndex inside a loop over updates: quadratic, invisible at 100 rows, painful at 50,000.",
              },
              {
                do: "Measure in a production build, on a mid-range device, several runs.",
                avoid: "Judging performance in development mode: React does extra work there and numbers are several times higher.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Naive / Optimized", watch: "With 20,000 rows, Naive re-renders all 20,000 rows on every update, blocks the main thread and drops frames; Optimized re-renders only the few visible rows that changed." },
              { control: "Windowing", watch: "“Rows in the page” drops from every matching row to about 25. Turning it off at 50,000 rows asks first." },
              { control: "Memoized rows", watch: "With windowing on, “rows re-rendered” per update goes from about 25 to the few visible rows that changed; clicking a row re-renders 2 rows instead of all." },
              { control: "Cached filter & sort", watch: "Sort by Change % and pause the feed, then click rows: “Filter + sort” stays at its old value with the cache, and re-runs on every click without it." },
              { control: "Deferred filtering", watch: "Turn it off with windowing off and type: the input itself lags (typing delay in the hundreds of ms). With it on, letters appear at once and “updating…” shows while the board catches up." },
              { control: "Indexed updates", watch: "Set 2,000 rows per update at 50,000 instruments: “Apply update” goes from under 1 ms to hundreds of ms without the index." },
              { control: "Updates / Rows per update", watch: "More updates per second multiply every per-update cost; find where each configuration starts to drop frames." },
              { control: "Pause feed", watch: "Stops live updates (also paused automatically while the tab is hidden or after a render over 1 s)." },
              { control: "Run benchmark", watch: "Runs the same 10-second scenario; run Naive and Optimized with the same dataset and compare the rows. The best value in each column is marked." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>Windowing breaks find-in-page and printing of off-screen rows, and needs care for screen readers (row counts and positions are exposed here).</li>
            <li>memo adds a prop comparison per row and keeps previous props in memory; for cheap rows that change every time it can cost more than it saves.</li>
            <li>Deferring keeps the input responsive but shows stale results for a moment; the board is dimmed while it catches up.</li>
            <li>All work stays on the main thread. Beyond this scale, move filtering and sorting to a Web Worker or the server (practice 13), or draw with canvas.</li>
            <li>The browser downloads the whole dataset (7 MB of JSON at 50,000 rows); real apps page or stream it.</li>
            <li>Page-side timing covers render and commit but not the browser&apos;s own layout and paint; frame rate and long tasks show that part.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
