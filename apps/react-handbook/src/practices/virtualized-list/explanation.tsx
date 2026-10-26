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
          A list of up to 100,000 tickets that scrolls like a list of 20: only
          the rows near the visible area exist on the page, and a spacer as
          tall as the whole list gives the scrollbar its true size. Rows have
          different heights, so each one starts with an estimate and is
          measured once drawn, without the view ever jumping.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "Render a window", text: "render the visible rows plus a few above and below (overscan); everything else is empty space." },
          { title: "Estimate, then measure", text: "unknown rows use a guessed height; drawn rows report their real one." },
          { title: "Anchor the view", text: "when heights change, put the first visible row back where it was before the frame is painted." },
          { title: "Keep the active row alive", text: "the focused row stays on the page even when scrolled away, so keyboard and screen reader users never lose their place." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Logs, inboxes, ticket queues, chat history, transaction lists: anything with thousands of rows.</li>
            <li>Pickers and autocompletes over large option sets (countries, products, users).</li>
            <li>Long tables and spreadsheets (the same idea per column is practice 13).</li>
            <li>Infinite feeds that have grown long enough to slow the page down.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            The algorithm lives in a plain class with no React in it. Row sizes
            are stored by ticket, so they survive filtering and sorting, and a
            Fenwick (binary indexed) tree over them answers “where does row i
            start?” and “which row is at pixel y?” in O(log n). A prefix-sum
            array would be just as fast to read, but every measured row would
            cost O(n) to update.
          </p>
          <p>
            Each row is absolutely positioned with <code>translateY</code>{" "}
            inside a spacer of the total height, so a wrong estimate moves only
            our numbers, never the layout. After every commit, a{" "}
            <code>useLayoutEffect</code> measures the rendered rows, recomputes
            the scroll position from the anchor (first visible row + pixels into
            it) and sets <code>scrollTop</code>; the store notification that
            follows re-renders synchronously, so the first frame the browser
            paints is already corrected. The browser&apos;s own scroll anchoring
            is turned off (<code>overflow-anchor: none</code>) so it doesn&apos;t
            correct a second time.
          </p>
          <p>
            Jumps and arrow keys set a reveal target (“row 87,000 at the top”,
            “row 12 fully visible”) that is re-applied after every correction
            until the user scrolls: rows above the target are only estimates
            when the jump starts, and they settle as they are drawn. Scroll
            events we cause ourselves are told apart from the user&apos;s by
            the position we last set.
          </p>
          <p>
            The list box uses a roving tabindex: focus sits on a real row
            element, and that row is pinned into the render even when it is far
            outside the window. Every option carries <code>aria-posinset</code>{" "}
            and <code>aria-setsize</code>, so “12 of 100,000” is announced
            although only about 20 options exist. Only the scroll box is
            observed for size changes (a new width re-wraps every row, so
            measurements are dropped and the anchor kept); rows are measured in
            the layout effect instead, which avoids ResizeObserver loop errors.
          </p>
          <p>
            Tickets are generated in the browser from one seed per ticket, in
            chunks of 5,000 so 100,000 never block the page in one go. The
            filter runs through <code>useDeferredValue</code> over pre-folded
            text (accents and case removed once), and sort orders are cached.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: "Measure real heights and correct the scroll position against an anchor before paint.",
                avoid: "Assuming every row has the same height, or correcting in a later frame so the content visibly jumps.",
              },
              {
                do: "Store measured sizes by item identity, so they survive filtering, sorting and inserts.",
                avoid: "Caching sizes by position: after a sort every row gets someone else's height.",
              },
              {
                do: "Keep the focused row rendered and move focus with preventScroll, then scroll yourself.",
                avoid: "Letting the focused element unmount when it scrolls out of the window: focus falls back to the page body.",
              },
              {
                do: "Give options their position in the whole list (aria-setsize / aria-posinset).",
                avoid: "Letting assistive tech count only the rows that happen to be in the DOM.",
              },
              {
                do: "Use a small overscan and positioned rows (transform) inside a full-height spacer.",
                avoid: "Huge overscan, or padding tricks that make every row reflow when one changes.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Rows", watch: "At 100,000 the scrollbar is tiny but “Rows on page” stays around 20 to 30; the same row number always shows the same ticket." },
              { control: "Rendering: Naive", watch: "At 10,000 rows “Rows on page” jumps to 10,000 and “Last update” to hundreds of ms; switch back and both drop while the top row stays put (that switch also pays for removing the 10,000 rows). Disabled above 20,000." },
              { control: "Overscan", watch: "0 can flash blank space on fast flings; 20 renders more rows per frame. Watch “Rows on page”." },
              { control: "Estimated height", watch: "Set it to 40 or 200 and drag the scrollbar: the thumb resizes as rows are measured, but the rows you're looking at never move." },
              { control: "Debug view", watch: "Each rendered row shows its number and whether its height is measured or estimated; overscan rows are tinted. The label makes every row taller, yet turning it on doesn't move the row at the top. “Measured” counts rows drawn so far." },
              { control: "Go to row", watch: "Type 87,000: the row lands exactly at the top, even though the rows above it were never measured." },
              { control: "Filter / Sort", watch: "Select a ticket, then filter or sort: it stays at the same place in the box if it's still in the list. Accents don't matter (“jose” finds “José”)." },
              { control: "Keyboard", watch: "Tab into the list, hold Down, press End, Page Up: focus always stays on a visible row; Enter selects." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>Browsers cap element heights (about 17 million px in Firefox, 33 million in Chrome); beyond ~150,000 rows of this size the spacer would need scaling, which we don&apos;t do.</li>
            <li>Find-in-page (Ctrl+F) and in-page anchors can&apos;t see rows that aren&apos;t rendered; the filter is the replacement.</li>
            <li>Setting <code>scrollTop</code> during a touch fling can cut the momentum short on some mobile browsers; corrections are rare once rows near the view are measured.</li>
            <li>We scroll an inner box. Virtualizing against the page scroll works the same way, offset by where the list starts on the page, but has to share the scroll with everything else.</li>
            <li>Rows must not change height on their own while hidden; anything that does (images, expanding content) needs to be measured again when it changes.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
