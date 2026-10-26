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
          A searchable accordion is a long list of questions that each expand to
          their answer, with a search box that narrows the list as you type. It
          solves the help-center problem: people rarely know the exact wording,
          category or accents used, and they need to see why each result is
          listed, even when the match is hidden in a collapsed answer.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "A real disclosure pattern", text: <>each question is a <code>button</code> in a heading with <code>aria-expanded</code>, and closed answers are <code>inert</code>.</> },
          { title: "Forgiving, literal search", text: "every word must appear, in any order, ignoring case and accents, with no regular expressions." },
          { title: "Every match is shown", text: "highlights in questions and open answers, and a snippet for matches in closed ones." },
          { title: "State survives filtering", text: "a section you opened is still open when it comes back into the results." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>A help center or FAQ page with dozens of questions grouped by topic.</li>
            <li>Product documentation or release notes where each entry expands to its details.</li>
            <li>A settings page with many collapsible groups and a “Search settings” box.</li>
            <li>A policy or terms page where people jump to the one clause they care about.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            The questions come from the project&apos;s own mock endpoint, so
            loading and error states are real. Each question is a button inside
            a heading, pointing at its answer with <code>aria-controls</code>,
            and the answer is labelled by its question. Answers aren&apos;t
            landmark regions, because with dozens open every one would become a
            landmark. A closed answer stays in the page so its height can
            animate (a grid row going from <code>0fr</code> to <code>1fr</code>),
            but it&apos;s <code>inert</code>: out of the tab order and hidden
            from screen readers.
          </p>
          <p>
            Search folds text one character at a time (remove accents, lowercase)
            and remembers where each folded character came from. Matching runs
            on the folded text with <code>indexOf</code>, so “zurich” finds
            “Zürich” and <code>C++</code> is just text. Overlapping matches are
            merged, then highlights are mapped back to the original text and
            rendered as plain strings and <code>&lt;mark&gt;</code> elements,
            never as injected HTML.
          </p>
          <p>
            Open sections live in a reducer, in the order they were opened, and
            filtering never touches that list. The search index is built once
            per load, the list follows a deferred copy of the query
            (<code>useDeferredValue</code>), unchanged sections are memoized, and
            off-screen ones use <code>content-visibility: auto</code>, so typing
            stays smooth with about 400 sections.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: <>Use a real <code>button</code> inside a heading, with <code>aria-expanded</code> and <code>aria-controls</code>.</>,
                avoid: "Clickable divs, or turning every answer into a landmark region when many can be open.",
              },
              {
                do: <>Make collapsed content <code>inert</code> (or remove it) so Tab and screen readers skip it.</>,
                avoid: "Hiding answers only visually, so keyboard users tab into text they can't see.",
              },
              {
                do: "Fold accents and case per character and keep a map back to the original text.",
                avoid: "Folding the whole string first: lengths can change and highlights land in the wrong place.",
              },
              {
                do: <>Match with <code>indexOf</code> and build highlights from text and <code>&lt;mark&gt;</code> nodes.</>,
                avoid: <>Building a <code>RegExp</code> from user input or injecting highlighted HTML.</>,
              },
              {
                do: "Index once, defer the query and memoize rows so long lists stay responsive; announce the result count after typing pauses.",
                avoid: "Re-folding every answer on each keystroke, or announcing the count on every key.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Open sections: One at a time / Many", watch: "With several sections open, switch to “One at a time”: only the most recently opened stays open, and opening another closes it." },
              { control: "Content size", watch: "“Large (~400)” reloads ten times the content. Type in the search box and watch the list keep up." },
              { control: "Latency", watch: "Takes effect on the next load. Set it high and press Reload to see the list-shaped loading placeholder." },
              { control: "Failure rate", watch: "Set it to 100% and press Reload: an error appears in the demo with a Retry button." },
              { control: "Reload", watch: "Loads again with the current settings. Your search and open sections are kept." },
              { control: "Search box", watch: "Try “card refund”, “zurich” or “C++”. The count shows “N of M sections match”; a match only in a closed answer shows a “Match in answer” badge with a snippet. Escape clears it." },
              { control: "Expand all / Collapse all", watch: "Only in “Many” mode. During a search they affect only the sections shown, and each disables when there is nothing left to do." },
              { control: "Keyboard", watch: "Press Down in the search box to reach the first question, then Up, Down, Home and End to move between questions; Enter or Space toggles one." },
              { control: "Clear search", watch: "Search for “zzz” to reach the “No results” state. Clearing restores the list and puts focus back in the search box." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>Sections that match only in their answer aren&apos;t opened for you: a badge and snippet explain the match without changing what you opened.</li>
            <li>No fuzzy or typo-tolerant matching and no relevance ranking: results keep content order.</li>
            <li>Content is loaded once and searched in the browser; server-side search, debouncing and caching are a separate practice.</li>
            <li>The search and open sections aren&apos;t kept in the URL, and the large set is the normal content repeated with numbered variants.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
