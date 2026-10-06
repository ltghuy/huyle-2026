export function Explanation() {
  return (
    <>
      <p>
        One module-level store holds every toast. Components subscribe with{" "}
        <code>useSyncExternalStore</code>, so any code (an event handler, a
        promise callback, another practice) can call <code>toast.success()</code>{" "}
        without a provider. The toast area is mounted once in the playground
        layout, so toasts survive navigation.
      </p>
      <ul>
        <li>
          <strong>Announcements:</strong> two hidden live regions exist from the
          start: <code>role=&quot;status&quot;</code> (polite) and{" "}
          <code>role=&quot;alert&quot;</code> (assertive, errors only). Text is
          written into them when a toast becomes visible or updates. The toasts
          themselves aren&apos;t live regions, so nothing is read twice, and they
          never take focus.
        </li>
        <li>
          <strong>Fair timers:</strong> each toast stores its <em>remaining</em>{" "}
          time. Hover, keyboard focus and a hidden tab are separate pause
          reasons; timers resume with what&apos;s left only when none apply.
          Errors and toasts with an action never time out.
        </li>
        <li>
          <strong>Queue:</strong> at most <em>N</em> toasts are visible; the rest
          wait first-in, first-out, and a queued toast&apos;s timer only starts
          when it appears. Identical toasts merge into one with a count.
        </li>
        <li>
          <strong>Async:</strong> <code>toast.promise()</code> updates one toast in
          place from loading to success or error, with a 30 s timeout.
        </li>
        <li>
          <strong>Motion without JS:</strong> enter uses{" "}
          <code>@starting-style</code>; exit collapses a{" "}
          <code>grid-template-rows</code> track so neighbours slide into the
          gap; the countdown bar is a paused/resumed Web Animation.
        </li>
        <li>
          <strong>Keyboard:</strong> F8 jumps to the newest toast, Escape
          dismisses it and returns focus.
        </li>
      </ul>
    </>
  );
}
