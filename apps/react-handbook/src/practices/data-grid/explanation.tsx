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
          A data grid that stays correct as it grows features: several sort
          keys at once, filters that combine, pages that stay valid when the
          data shrinks, columns you can resize, and a selection that survives
          all of it, including &quot;select all 2,000 matching rows&quot; the
          browser never downloaded. The same grid can run its query in the
          browser or on the server; switch between them to see what each
          costs.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "Derive the view", text: "the rows on screen are filter → sort → page of the data, computed from the view state, never stored and patched." },
          { title: "Select by id, not by row", text: "a set of ids survives sorting and paging; “all matching” is a rule (this filter, except these ids), not a list." },
          { title: "One query, two places", text: "the browser and the mock API call the same pure function, so both modes always show the same rows." },
          { title: "One tab stop", text: "the grid is a single stop on the page; arrow keys move between cells, and keys on the focused cell sort, select and resize." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Admin and back-office screens: users, orders, invoices, audit logs.</li>
            <li>Anything with bulk actions (“archive these 37”), where the selection must be exactly what the user sees.</li>
            <li>Reports people slice by several columns and share as links.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            The view is plain data: up to three sort keys, a search string,
            column filters, page and page size. One pure function,{" "}
            <code>queryEmployees</code>, turns (rows, view, selection) into a
            page: it folds text (case, accents, extra spaces) and keeps rows
            where every search word appears in a text column and every filter
            holds, sorts with a comparator chain, and slices the page,
            clamping it to the last page so a shrinking result never shows
            &quot;Page 7 of 2&quot;. Text compares with{" "}
            <code>Intl.Collator</code> (numeric, accent-aware), so “Engineer 2”
            comes before “Engineer 10” and “Ömer” sorts near “Omar”; empty
            values sort last in both directions, and the id is the final key,
            so equal rows never swap between renders. Impossible ranges (min
            above max) are ignored instead of returning nothing.
          </p>
          <p>
            A framework-free <code>GridController</code> owns the view, the
            selection and the processing mode; React subscribes with{" "}
            <code>useSyncExternalStore</code>. It keeps the last applied result
            on screen and marks it <em>pending</em> (dimmed, <code>aria-busy</code>)
            until the result for the current view replaces it. In browser mode
            it downloads the dataset once per size (cached at module level) and
            runs the query synchronously, timing it with{" "}
            <code>performance.now()</code>. In server mode it POSTs the view to
            the mock API, which runs the same function: search typing waits
            300 ms, every send increments a run id and aborts the previous
            request, and only the latest run may apply its response, so a slow
            sort can never overwrite a newer one. The page server-renders the
            first page from the URL with the same function, so there is no
            loading flash and only 25 rows cross to the client.
          </p>
          <p>
            Selection is either a set of ids or{" "}
            <code>{"{ all, filterKey, except, total }"}</code>. Checking every
            row of a page offers “Select all N matching”; deselecting a row then
            adds it to <code>except</code>, so the count is{" "}
            <code>total − except</code> without listing 10,000 ids. When the
            filters change under that rule, browser mode turns it into the
            explicit ids it covered (it knows every row); server mode
            can&apos;t, so it clears it and says why. Shift+click applies the
            clicked row&apos;s new state to the range from the last toggled row.
            The server reports which selected ids match the current filters,
            which is how “3 hidden by filters” works without downloading rows.
          </p>
          <p>
            The table uses <code>table-layout: fixed</code> with a{" "}
            <code>&lt;colgroup&gt;</code> of pixel widths, so widths are exact
            and cheap, and it scrolls inside its own box instead of squeezing
            columns. The resize handle uses pointer capture, which keeps move
            events coming when the pointer leaves the handle and ends the drag
            on <code>lostpointercapture</code> (release or cancel); rows are
            memoized, so a drag re-renders only the header. The keyboard
            follows the WAI-ARIA data grid pattern: one cell has{" "}
            <code>tabIndex=0</code> (roving tabindex), arrows, Home/End and
            Ctrl+Home/End move, PageUp/PageDown change page, and when the
            focused cell is replaced (new page, fewer rows) focus moves to the
            same position instead of falling to the page body.{" "}
            <code>aria-rowcount</code> and <code>aria-rowindex</code> tell screen
            readers where a row sits in the whole result, <code>aria-sort</code>{" "}
            marks the primary sort column, and polite live regions announce the
            result, the selection count and new column widths.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: "Keep the view (sort, filters, page) as state and derive the visible rows from it.",
                avoid: "Storing the sorted, filtered page in state and patching it on every change: it drifts from the data.",
              },
              {
                do: "Make the sort stable: end the comparator chain with a unique key, and put empty values last in both directions.",
                avoid: "a.localeCompare(b) alone: equal rows reorder between renders, and “Item 10” sorts before “Item 2”.",
              },
              {
                do: "Reset to page 1 when sort or filters change, and clamp the page to the last one.",
                avoid: "Keeping page 7 after filtering to 2 pages: an empty grid that looks like “no results”.",
              },
              {
                do: "Select by id, and model “select all matching” as filter + exceptions.",
                avoid: "Selecting by row index, or fetching every matching id just to tick them.",
              },
              {
                do: "In server mode, let only the latest request update the grid (run id), and abort the rest.",
                avoid: "setRows(await fetch(...)) per click: a slow earlier sort lands last and wins.",
              },
              {
                do: "Give the grid one tab stop and move focus with arrow keys; restore focus when its cell is re-rendered.",
                avoid: "A tab stop per cell or checkbox: hundreds of Tab presses to get past one page.",
              },
              {
                do: "Use table-layout: fixed with explicit widths, and let the grid scroll in its own box.",
                avoid: "Auto layout with resizable columns: every content change re-measures and columns jump.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Sort, filter and page", watch: "“In the browser” downloads the dataset once (see the stats line), then every change is a few milliseconds with 0 requests. “On the server” sends one small request per change and dims the rows while it waits." },
              { control: "Dataset", watch: "10,000 employees is about 1.7 MB to download in browser mode, versus under 20 KB per page on the server. Sorting 10,000 rows in the browser still takes only a few milliseconds." },
              { control: "Server latency", watch: "Set 1,000 ms in server mode and click Name and Salary quickly several times: requests overtake each other, yet the rows always match the header arrows." },
              { control: "Failure rate", watch: "At 100%, the next change fails: the previous rows stay, with an error and Retry. Set it back to 0 and Retry." },
              { control: "Headers", watch: "Click to cycle ascending, descending, unsorted. Shift+click adds a second and third key; the small numbers show priority." },
              { control: "Select all matching", watch: "Tick the header checkbox, then “Select all N matching”; go to the last page: those rows are selected too. Untick one: the count drops by one." },
              { control: "Filters with a selection", watch: "Select a few rows, then filter them out: “hidden by filters” counts them. With “all matching” selected, change a filter: browser mode keeps exactly those rows, server mode clears the selection and tells you why." },
              { control: "Column edges", watch: "Drag a header's right edge; double-click it to reset. With a header focused, Alt+→ widens by 10 px." },
              { control: "Keyboard", watch: "Tab into the grid, move with arrows, Space selects a row, Shift+Space selects a range, PageDown changes page and keeps your column." },
              { control: "URL", watch: "Sort and filter, then reload: the same view renders on the first paint. Back leaves the page instead of undoing filters." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>Browser mode is instant after the download but pays for the whole dataset up front and holds it in memory; past tens of thousands of rows (or with sensitive data) the server is the only option.</li>
            <li>Server mode costs a round trip per change and needs a debounce for typing; it has no cache here, so going back a page refetches.</li>
            <li>“All matching” in server mode can&apos;t survive a filter change: the server&apos;s matching set changed, and turning the rule into ids would mean downloading them.</li>
            <li>Paging keeps the DOM small; showing thousands of rows at once needs virtualization, which practice 14 covers.</li>
            <li>Column widths last for the visit; persisting them means storing them per user (local storage or the server) and versioning them with the columns.</li>
            <li>Filters are single-value per column, and there is no column reordering, pinning or cell editing: each is a pattern of its own.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
