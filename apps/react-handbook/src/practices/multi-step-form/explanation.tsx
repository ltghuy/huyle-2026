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
          A long form as a wizard, without a form library: one set of
          answers split into steps, each checked before moving on, with
          steps that depend on earlier answers, a draft that survives a
          reload, a step in the address so the browser&apos;s Back button
          works, and a server that checks everything again. Fill it in, then
          try a reload, the Back button, switching the role, and the
          server&apos;s failure modes.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "One form, many steps", text: "one store holds every answer; a step is just which fields you see and which rules must pass to leave it." },
          { title: "Derive, don't store", text: "errors, applicable steps and which steps can be opened are computed from the answers, so they can't go stale." },
          { title: "The address is the step", text: "Next adds a history entry, corrections replace it, so Back, Forward, refresh and links work per step." },
          { title: "Same rules, both sides", text: "the server re-runs the browser's schemas plus its own checks, and its errors land on the right step and field." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Applications, onboarding, checkout, insurance quotes, tax forms: anything too long for one screen.</li>
            <li>Forms where later questions depend on earlier answers.</li>
            <li>Long forms people fill in over several visits, or on flaky connections.</li>
            <li>Before reaching for a form library: this is the engine those libraries hide.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            Every answer lives in one external store, grouped by step, as the
            user typed it (strings, booleans, lists). Fields read their slice
            with <code>useField(path)</code>, built on{" "}
            <code>useSyncExternalStore</code> with an equality-checked
            selection, so a keystroke re-renders that field and the
            inspector, not the form. Next to the values, the store keeps
            what&apos;s <em>known</em> about them: visited fields, steps where
            Next was tried, server errors and the furthest step reached.
          </p>
          <p>
            Rules are one Zod schema per step, in a module shared with the
            server. Errors are never stored: they&apos;re the schema&apos;s
            issues for the current values, <em>shown</em> only once a field
            was left, its step was tried, or the server reported one. One
            rule spans steps (the start date on Role can&apos;t be before the
            earliest legal start on Work authorization); it&apos;s reported on
            the later step, which then shows as needing attention.
          </p>
          <p>
            Which steps apply is a function of the answers (Engineering or
            Design questions by role, Work authorization only when
            sponsorship is needed). A step can be opened if every step before
            it is valid and it isn&apos;t past the furthest one reached; that
            one rule drives the progress list, deep links and draft restore.
            Answers to steps that stop applying stay in memory for the visit
            but are never validated, saved or sent.
          </p>
          <p>
            The step is <code>?step=…</code> in the address, read with{" "}
            <code>useSearchParams</code> (inside a <code>Suspense</code>{" "}
            boundary) and changed with <code>history.pushState</code>; an
            address naming a step that can&apos;t be opened is corrected with{" "}
            <code>replaceState</code>, so it adds no history entry. Every
            step change focuses the step&apos;s heading (&quot;Step 3 of 7:
            Experience&quot;), and a failed Next focuses an error summary
            whose links focus each field.
          </p>
          <p>
            The draft (applicable answers, step, furthest step) is saved to{" "}
            <code>localStorage</code> 400 ms after a change as{" "}
            <code>{"{ version: 2, … }"}</code>, parsed with a types-only schema on
            load (an answer that breaks today&apos;s rules is kept and shown
            with its error), migrated from version 1, or discarded with a
            note when unreadable. The email check is debounced, aborts the
            previous request and ignores answers that aren&apos;t for the
            latest one; Next waits for it. Submit re-validates in the
            browser, posts only applicable steps, and maps the server&apos;s{" "}
            <code>{"{ step, path, message }"}</code> issues back onto fields,
            opening the earliest step that has one.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: "Show an error once a field is left or Next is pressed, then update it as the user types.",
                avoid: "Errors on the first keystroke, or only after submitting the whole form.",
              },
              {
                do: "Put the error next to its field and a summary at the top that links to each one; move focus to the summary.",
                avoid: "A red border alone, or one message at the top that doesn't say which field.",
              },
              {
                do: "Derive conditional steps from the answers and leave non-applicable answers out of what's saved and sent.",
                avoid: "Storing the list of steps, or sending hidden answers the user can no longer see.",
              },
              {
                do: "Keep the step in the address and use replace for corrections.",
                avoid: "A step index in component state: refresh resets it and Back leaves the form.",
              },
              {
                do: "Share the rules with the server and still treat every request (and every saved draft) as untrusted.",
                avoid: "Trusting the browser's validation, or JSON.parse straight from storage into the form.",
              },
              {
                do: "Debounce async field checks, cancel the previous request, and drop answers that aren't for the latest value.",
                avoid: "Firing a request per keystroke and showing whichever answer arrives last.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Next on an empty step", watch: "Errors appear by each field, the summary at the top gets focus, and its links jump to each field." },
              { control: "Role and sponsorship", watch: "Engineering or Design adds its own step, Sales adds none, and needing sponsorship adds Work authorization; Step X of N and the progress list follow." },
              { control: "Browser Back / Forward, refresh", watch: "You move one step at a time with your answers kept; a refresh reopens the same step with a “Draft restored” note." },
              { control: "Email", watch: "Try taken@example.com: “Checking…”, then the error. Next waits for a pending check and won't skip it." },
              { control: "Fill with sample answers", watch: "Every step gets valid answers and Review opens; use Edit on a group, then “Back to review”." },
              { control: "On submit, the server", watch: "Rejects a field: the form opens Experience with the server's message on the company. Says email was used: back to Personal. Fails (500): everything stays, with Retry." },
              { control: "Server latency", watch: "Slow it down to see “Checking…” and “Sending…”; pressing Submit again does nothing while it's sending." },
              { control: "Load a v1 draft / a corrupted draft", watch: "An old-format draft is converted (a Design applicant with two jobs); a corrupted one is discarded with a note instead of crashing." },
              { control: "Form inspector", watch: "Errors from the rules exist from the start; watch Visited and Tried decide when they're shown." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>A form library would give you this (and more field types) for less code; the hand-built engine is here to show what it does.</li>
            <li>The draft lives in one browser; two tabs editing at once overwrite each other, and files can&apos;t be saved in a draft at all.</li>
            <li>Answers for steps that stopped applying are gone after a reload, by design.</li>
            <li>Month rules use the month the visit started; a form left open across midnight on the last day of a month keeps the old &quot;today&quot;.</li>
            <li>No JavaScript, no wizard: a real app might fall back to a long single-page form.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
