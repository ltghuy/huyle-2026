export function Explanation() {
  return (
    <>
      <p>
        Each question is a <code>button</code> inside a heading, with{" "}
        <code>aria-expanded</code> and <code>aria-controls</code> pointing at its
        answer, which is labelled by the button. Answers aren&apos;t landmark
        regions: with dozens open, every one would become a landmark.
      </p>
      <ul>
        <li>
          <strong>Hidden means hidden:</strong> a collapsed answer stays in the
          DOM for the height animation (a <code>grid-template-rows</code> track
          going from <code>0fr</code> to <code>1fr</code>) but is{" "}
          <code>inert</code>, so it&apos;s out of the tab order and the
          accessibility tree.
        </li>
        <li>
          <strong>Accent folding with a map:</strong> text is folded one
          character at a time (<code>normalize(&quot;NFD&quot;)</code>, strip
          marks, lowercase) while recording where each folded character came
          from. Matching runs on the folded text; highlights are mapped back,
          so “cafe” lights up the original “Café”.
        </li>
        <li>
          <strong>Literal matching:</strong> <code>indexOf</code>, never a{" "}
          <code>RegExp</code> built from input, so <code>C++</code> or{" "}
          <code>(beta)</code> just work. Every word must appear, in any order.
        </li>
        <li>
          <strong>Safe highlights:</strong> overlapping or touching ranges are
          merged, then the text is split into strings and <code>&lt;mark&gt;</code>{" "}
          elements. No <code>innerHTML</code>, so content like{" "}
          <code>&lt;b&gt;</code> shows as text.
        </li>
        <li>
          <strong>State that survives filtering:</strong> open ids live in a
          reducer, ordered by when they were opened. Filtering never edits
          them; switching to one-at-a-time keeps the most recent.
        </li>
        <li>
          <strong>Fast with 400 sections:</strong> the search index is built once
          per load, the list uses a deferred query, unchanged sections are
          memoized, and off-screen ones use <code>content-visibility: auto</code>.
        </li>
      </ul>
    </>
  );
}
