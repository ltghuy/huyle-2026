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
          Toasts are short messages that pop up in a corner, stack, disappear on
          their own, and can carry an action like Undo or follow a slow request
          from “Saving…” to its result. They look simple, but the pattern combines
          app-wide state, timers that pause and resume, a queue, motion and
          screen-reader announcements in one small surface.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "One store, no provider", text: <>any code can call <code>toast.success()</code>, and toasts survive navigation.</> },
          { title: "Fair timers", text: "a toast is visible for its full duration of time you could actually see it." },
          { title: "A queue, not a pile", text: "only a few toasts show at once; the rest wait their turn." },
          { title: "Announced, never focus-stealing", text: "screen readers hear every toast; errors more urgently." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Confirming an action that has no page of its own: “Changes saved”, “Link copied”.</li>
            <li>Offering a short way back: “Invoice deleted · Undo”.</li>
            <li>Following background work: an upload or save that moves from loading to done or failed.</li>
            <li>App-wide notices from anywhere: a connection lost toast raised by a data layer, not a page.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            A small store lives outside React and holds every toast. Components
            subscribe to it with <code>useSyncExternalStore</code>, and the toast
            area is mounted once in the playground layout, outside each
            demo&apos;s error boundary, so a crashing demo can&apos;t take the
            toasts down and other practices reuse the same system.
          </p>
          <p>
            Each toast remembers how much time it has left. Hover, keyboard focus
            and a hidden tab are tracked as separate pause reasons; the timer
            only runs when none of them apply, then continues with what was
            left. A visible limit sends extra toasts to a first-in, first-out
            queue, and identical toasts merge into one with a count.
          </p>
          <p>
            <code>toast.promise()</code> keeps one toast and updates it in place
            from loading to success or error, with a 30 s timeout. Two hidden
            live regions do the announcing, so the toasts themselves never need
            focus. Motion is CSS only: <code>@starting-style</code> to enter, a
            collapsing grid row to exit.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: "Keep errors and toasts with an action on screen until dismissed.",
                avoid: "Timing out something the user must read or act on (WCAG 2.2.1).",
              },
              {
                do: "Pause timers on hover, keyboard focus and a hidden tab, and resume with the remaining time.",
                avoid: "Restarting the full timer, or letting a toast vanish while someone is reading it.",
              },
              {
                do: "Announce through a polite region, and an assertive one only for errors.",
                avoid: "Making every toast a live region or moving focus to it: content gets read twice and typing is interrupted.",
              },
              {
                do: "Update one toast in place for async work.",
                avoid: "Stacking “Saving…”, then “Saved” as separate toasts.",
              },
              {
                do: "Give keyboard users a way in and out: F8 to reach the newest toast, Escape to dismiss.",
                avoid: "Toasts only reachable with a mouse.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Success / Error / Info / Warning", watch: "Errors stay until dismissed; the others count down (watch the thin bar). Hover or press F8 and the countdown stops." },
              { control: "With action", watch: "The Undo toast never times out. Pressing Undo runs once, then the toast closes." },
              { control: "Burst (10)", watch: "Only “Max visible” toasts show; the rest wait behind a “+N more” count and appear as others close." },
              { control: "Dismiss all", watch: "Visible and queued toasts all go, without errors." },
              { control: "Position", watch: "Six corners and edges; the newest toast is always nearest the screen edge." },
              { control: "Duration", watch: "Applies to new toasts only; toasts already on screen keep their time." },
              { control: "Max visible", watch: "Lowering it sends the extra toasts back to the front of the queue instead of dropping them." },
              { control: "Delete with Undo", watch: "A real use case: the item disappears, and Undo brings it back." },
              { control: "Track a request + Save latency / failure rate", watch: "One toast goes from loading to success or error in place. Try a high failure rate, or leave the page while it's loading: the toast still updates." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>A list with a queue instead of a collapsed “deck”: predictable and easier to make accessible, with less animation flair.</li>
            <li>No swipe-to-dismiss: the close button, Escape and the timeout cover it.</li>
            <li>No history or notification center, and toasts don&apos;t survive a full reload: they are transient by design.</li>
            <li>Text only (title, description, one action), to keep the focus on behavior.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
