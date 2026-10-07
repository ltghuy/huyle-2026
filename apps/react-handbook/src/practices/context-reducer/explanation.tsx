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
          Shared app state without a state library: one reducer with typed
          actions owns the cart, React context makes it available everywhere,
          and components re-render only when what they show changes. Switch
          how the state is shared and watch the render counters, then try
          undo, time travel, a reload, a second tab and a failing checkout.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "One reducer, typed actions", text: "every change is an action object; an unhandled action type is a compile error." },
          { title: "A context value is all or nothing", text: "every consumer re-renders when it changes, so { state, dispatch } in one context re-renders everyone." },
          { title: "Subscribe to slices", text: "put a store in context and let each component select only what it shows." },
          { title: "Immutable states are snapshots", text: "undo, redo and time travel are just keeping old states around." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Carts, editors, wizards and dashboards: state many components read and change.</li>
            <li>Anywhere you need undo, an audit trail, or to replay what happened.</li>
            <li>Apps that should survive a reload or stay in sync across tabs.</li>
            <li>Before reaching for a state library: this is what those libraries do inside.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            <code>shopReducer</code> handles a discriminated union of actions
            (<code>cart/add</code>, <code>history/undo</code>,{" "}
            <code>checkout/failed</code>…) with a <code>never</code> check in
            its <code>default</code> branch. It never mutates: cart
            operations return the same object when nothing changes and a new
            one otherwise. Cart changes push a new state onto a history (50
            deep); undo, redo and jumping from the log move one pointer, and
            a new change after undoing drops the future. Ids and timestamps
            are stamped by action creators, so the reducer stays pure and the
            log is part of the state.
          </p>
          <p>
            The same reducer is shared three ways. <strong>Single context</strong>{" "}
            passes <code>{"{ state, dispatch }"}</code>: a new object every
            render, so all ~35 consumers re-render on every action, even Add
            buttons that never read state. <strong>Split</strong> puts the
            stable <code>dispatch</code> in its own context, so dispatch-only
            components (memoized Add buttons, Clear cart) stop re-rendering;
            readers still all re-render. <strong>Selectors</strong> put a tiny
            store in context (its identity never changes) and each component
            calls <code>useShopSelector</code>, built on{" "}
            <code>useSyncExternalStore</code> with a memoized, equality-checked
            selected value, so only components whose slice changed re-render.
            Switching keeps everything because a session object hands the
            latest state to the next provider.
          </p>
          <p>
            The catalog comes from the shared <code>useQuery</code> cache
            (server data stays out of the reducer). The cart is saved to{" "}
            <code>localStorage</code> as <code>{"{ version: 2, lines, discount }"}</code>;
            on load it is parsed with Zod, migrated from v1 if needed, then
            checked against the catalog (unknown products dropped, quantities
            clamped). A <code>storage</code> event from another tab applies
            the same check and resets undo history. Checkout dispatches{" "}
            <code>checkout/started</code> (the cart looks empty right away),
            then <code>succeeded</code> or <code>failed</code>; because the
            real cart never left the history, failing is the rollback.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: "Keep reducers pure and state immutable; put ids, time and I/O in action creators and effects.",
                avoid: "Calling Date.now(), fetch or localStorage inside the reducer, or mutating the previous state.",
              },
              {
                do: "Split state and dispatch, or subscribe to slices with selectors, once many components share state.",
                avoid: "One context with a fresh { state, dispatch } object: every consumer re-renders on every change.",
              },
              {
                do: "Select primitives or memoize selected objects with an equality check.",
                avoid: "Selectors that build a new array or object every call: they re-render (or loop) every time.",
              },
              {
                do: "Read a value in an event handler when you only need it at click time.",
                avoid: "Subscribing a component to state it only needs when a button is pressed.",
              },
              {
                do: "Treat saved and synced state as untrusted: validate, migrate, reconcile.",
                avoid: "JSON.parse straight into the reducer: one old or edited value crashes the app.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Sharing strategy", watch: "Add a product in each mode: the scoreboard at the top keeps the latest count per strategy (Single ≈ 35 of 35, Split ≈ 22, Selectors 5–6), and the parts that re-rendered flash briefly." },
              { control: "Undo / Redo", watch: "Ctrl/⌘+Z and Shift+Ctrl/⌘+Z (or Ctrl+Y) work anywhere except inside text fields, which keep their own undo." },
              { control: "Action log", watch: "Select an older cart change: the cart and totals jump to that moment; later entries are marked “undone” and get discarded by the next change." },
              { control: "Reload the page", watch: "The cart comes back exactly; history and log start fresh." },
              { control: "Open a second tab", watch: "Change the cart in one tab: the other follows within a moment and logs “cart/synced”." },
              { control: "Load a v1 save", watch: "An old-format cart is migrated: the coupon becomes SAVE10, an unknown product is dropped and an over-stock quantity is reduced, with a note." },
              { control: "Load a corrupted save", watch: "The cart resets with a note instead of crashing." },
              { control: "Checkout failure", watch: "Server error: the cart comes back exactly, with Retry. Stock conflict: one line is reduced to what's available and listed." },
              { control: "Checkout latency", watch: "While “Placing order…” runs the cart is empty and locked; switch strategy meanwhile and it still settles." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>The selector hook re-implements what <code>use-sync-external-store/with-selector</code> or a state library gives you; it is short, but each selector must be stable or cheap.</li>
            <li>Undo history and the log live in memory only; a reload keeps the cart, not the past.</li>
            <li>Cross-tab sync is last-write-wins on the whole cart; merging concurrent edits would need per-line versions.</li>
            <li>Optimistic checkout hides the cart while waiting; if the tab closes mid-order, the saved cart still holds the items and the order may or may not exist.</li>
            <li>Render counts measure committed renders in this build; React may render more in development (Strict Mode double renders).</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
