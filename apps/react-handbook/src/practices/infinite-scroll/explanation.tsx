export function Explanation() {
  return (
    <>
      <p>
        An <code>IntersectionObserver</code> watches an empty marker after the
        last post, using the feed box as its root and the trigger distance as a
        bottom <code>rootMargin</code>. No scroll handler decides when to load.
      </p>
      <ul>
        <li>
          <strong>One request at a time:</strong> a ref is checked and set
          synchronously before every request; React state alone updates too late
          to stop a second scroll event. Requests are aborted when you leave.
        </li>
        <li>
          <strong>Fill the box:</strong> the observer is re-created each time
          loading settles. Its first callback re-checks whether the end is still
          near, so short pages keep loading until the box can scroll.
        </li>
        <li>
          <strong>Cursors, not page numbers:</strong> the server returns an opaque
          “older than post #N” marker. New posts get higher numbers, so they never
          shift older pages: no duplicates, no gaps. Offset paging would shift by
          every inserted post.
        </li>
        <li>
          <strong>Never move content under the reader:</strong> pages are only
          appended below. New posts wait behind the pill and are inserted at the
          top only when you ask, followed by a deliberate scroll to the top.
        </li>
        <li>
          <strong>Coming back:</strong> posts, cursor and the first visible post
          (plus its pixel offset) are kept in module memory, then restored in a
          layout effect before paint, with zero requests.
        </li>
        <li>
          <strong>Accessible feed:</strong> <code>role=&quot;feed&quot;</code> with{" "}
          <code>aria-busy</code>, focusable <code>article</code>s with{" "}
          <code>aria-posinset</code>/<code>aria-setsize</code>, Page Down/Up between
          posts, a polite live region for progress, and a visible Load more button.
        </li>
      </ul>
    </>
  );
}
