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
          A modal dialog that keyboard and screen reader users can rely on:
          focus moves in and can&apos;t wander behind it, the page underneath
          can&apos;t be scrolled, clicked or read, Escape and the backdrop close
          it unless that would lose work, and focus comes back to where you
          were. It is the playground&apos;s shared dialog: any practice can
          open one or <code>await confirm()</code>.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "Make the rest inert", text: "everything behind the top dialog gets the inert attribute; Tab still wraps by hand inside the dialog." },
          { title: "Choose where focus starts", text: "the safe button for confirmations, the first field for forms, the title for long documents." },
          { title: "Give focus back", text: "to the opener, or to a sensible fallback when the opener is gone, never to the page body." },
          { title: "Ask before losing work", text: "the owner decides on every Escape or backdrop click, so unsaved edits get a “Discard changes?” first." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Confirmations for destructive or irreversible actions (delete, cancel a subscription, sign out everywhere).</li>
            <li>Short focused tasks that shouldn&apos;t lose the page behind them: edit a record, invite a teammate, rename a file.</li>
            <li>Steps that block until answered: unsaved changes, session expiring, terms to accept.</li>
            <li>Not for: menus, tooltips or anything the user should be able to ignore (those are non-modal).</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            A small engine with no React keeps a stack of open dialogs. Each
            dialog is <code>role=&quot;dialog&quot;</code> (or{" "}
            <code>alertdialog</code> for confirmations) with{" "}
            <code>aria-modal</code>, named by its title and described by its
            description, rendered through a portal at the end of the page.
            When one opens, the engine walks the page from{" "}
            <code>&lt;body&gt;</code> and marks every branch that doesn&apos;t
            contain the top dialog <code>inert</code>, so it can&apos;t be
            focused, clicked or reached by a screen reader. The toaster is
            marked <code>data-modal-keep</code> and skipped, so toasts raised by
            a dialog are still announced and clickable.
          </p>
          <p>
            Inert doesn&apos;t wrap Tab (from the last control focus would go to
            the browser&apos;s toolbar), so a keydown listener wraps Tab and
            Shift+Tab inside the top dialog, and a focusin listener brings back
            focus that a script moves out. Page scroll is locked with{" "}
            <code>overflow: hidden</code> on <code>&lt;html&gt;</code>; when a
            classic scrollbar is present, <code>scrollbar-gutter: stable</code>{" "}
            keeps its space so nothing shifts.
          </p>
          <p>
            The <code>&lt;Modal&gt;</code> component is controlled: Escape, the
            backdrop and × only <em>ask</em> its owner to close
            (<code>onRequestClose(reason)</code>). Confirmations ignore the
            backdrop, and the profile form opens “Discard changes?” on top of
            itself when it has edits. A backdrop click counts only when the
            press both started and ended on the backdrop. Focus returns one
            frame after closing starts, so a caller can remove the opener first
            (the deleted row); when several dialogs close together, focus goes
            to the lowest one&apos;s opener. Opening uses CSS{" "}
            <code>@starting-style</code>; closing waits for the transition
            before unmounting, with no animation under reduced motion. On
            phones the same dialog becomes a bottom sheet sized from{" "}
            <code>visualViewport</code>, so it stays above the on-screen
            keyboard.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: "Make everything outside the dialog inert, and still wrap Tab yourself.",
                avoid: "Relying on aria-modal alone: some screen readers still browse the page behind, and the mouse can still click it.",
              },
              {
                do: "Start on the least destructive action in a confirmation.",
                avoid: "Focusing “Delete”: a habitual Enter destroys data.",
              },
              {
                do: "Return focus to the opener, or to a logical neighbour when it was removed.",
                avoid: "Letting focus fall to the page body, which sends keyboard users back to the top of the page.",
              },
              {
                do: "Let the owner veto dismissal (unsaved changes, confirmations).",
                avoid: "Closing on every Escape or backdrop click, or blocking Escape entirely.",
              },
              {
                do: "Keep the header and actions visible and scroll only the body; reserve the scrollbar gutter.",
                avoid: "Dialogs taller than the screen, and a page that jumps sideways when the scrollbar disappears.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Delete (projects)", watch: "Focus starts on Cancel; clicking the backdrop is logged as ignored. Delete: the row goes and focus lands on the next row, or “New project” after the last one." },
              { control: "Edit profile", watch: "Change a field, then press Escape, click the backdrop or Cancel: “Discard changes?” opens on top. Keep editing returns to your field; Discard closes both and focus is back on Edit profile. Save with an empty name: focus jumps to the error." },
              { control: "Open settings", watch: "Settings → Advanced… → Reset all settings…: three levels. Escape closes one at a time, each time focusing the button that opened it." },
              { control: "Read terms", watch: "Focus is on the title; Tab reaches the scrollable text, where arrow keys scroll it. Scrolling to the end never scrolls the page." },
              { control: "Native confirm", watch: "The browser's own modal: inert page, Escape and focus return for free, but the page still scrolls behind it and toasts are blocked too." },
              { control: "Backdrop click closes", watch: "Off: the backdrop does nothing anywhere (logged as ignored). Confirmations ignore it either way." },
              { control: "Animations", watch: "Off (or with reduced motion in your OS): dialogs appear and disappear instantly." },
              { control: "Layout", watch: "Bottom sheet: full width, attached to the bottom, actions stacked and taller; Auto switches when the window is narrower than 640 px." },
              { control: "Event log", watch: "Every open, close (with its reason) and ignored dismissal, with where focus went." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>Native <code>&lt;dialog&gt;.showModal()</code> now gives the top layer, inert, Escape and focus return for free; a hand-built dialog is still useful for scroll locking, exit animations, keeping toasts reachable and dismissal rules, but it is more code to get right.</li>
            <li>Inert is applied to elements that exist when the dialog opens; content added to the page later (another library&apos;s portal) isn&apos;t covered until the next dialog opens or closes.</li>
            <li>Toasts stay reachable by pointer and F8 while a dialog is open, which is a deliberate hole in the “nothing behind is reachable” rule.</li>
            <li>The phone sheet has no swipe-to-dismiss; it closes with its buttons, Escape or the backdrop.</li>
            <li>Dialogs aren&apos;t tied to the URL: Back leaves the page and closes them rather than closing just the dialog.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
