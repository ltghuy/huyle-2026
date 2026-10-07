export function Explanation() {
  return (
    <>
      <p>
        Messages arrive over one long-lived <code>text/event-stream</code>{" "}
        response (Server-Sent Events) and are sent with normal{" "}
        <code>POST</code> requests. The stream is read by hand with{" "}
        <code>fetch</code> and a small parser instead of <code>EventSource</code>,
        so every recovery step below is visible code, not browser magic.
      </p>
      <ul>
        <li>
          <strong>One order, no duplicates:</strong> the server gives every
          message a growing <code>seq</code>. The client keeps messages sorted by
          it and drops any <code>seq</code> it already has, whether it came from
          history, the stream or a send response.
        </li>
        <li>
          <strong>Optimistic sends:</strong> the client creates a{" "}
          <code>clientId</code> before sending and shows the message right away.
          The server&apos;s echo on the stream and the <code>POST</code> response
          both carry that id, so whichever arrives first replaces the pending
          message in place (same React key, no flicker).
        </li>
        <li>
          <strong>Idempotent retry:</strong> Retry reuses the same{" "}
          <code>clientId</code>. Half of the simulated failures happen after the
          server stored the message (a lost response), and the server answers a
          repeated id with the stored message, so nothing is shown twice.
          Unsent messages are kept in <code>localStorage</code> and re-sent after
          a reload.
        </li>
        <li>
          <strong>Resume, don&apos;t restart:</strong> every reconnect asks for{" "}
          <code>after=&lt;last seq&gt;</code>. The server replays what you missed
          and subscribes you in the same tick, so no message falls into the gap.
          If you were away longer than its 500-message window, it sends a reset
          with the latest page instead.
        </li>
        <li>
          <strong>Backoff with jitter:</strong> reconnect delays double from
          0.5 s up to 15 s, each randomized so many clients don&apos;t retry in
          lockstep. Retries pause while offline and start at once on{" "}
          <code>online</code>. A 15 s server ping lets the client spot a silently
          dead stream after 35 s.
        </li>
        <li>
          <strong>Stick to the bottom only when you&apos;re there:</strong> a
          scroll handler tracks whether you&apos;re within 48 px of the bottom. A
          layout effect and a <code>ResizeObserver</code> re-pin before paint
          only in that case; otherwise new messages raise a counter instead.
        </li>
        <li>
          <strong>Older history without a jump:</strong> before older messages
          are inserted above, the first visible message and its offset are
          remembered; after the insert, <code>scrollTop</code> is corrected so it
          stays put (<code>overflow-anchor: none</code> turns off the
          browser&apos;s own anchoring, which Safari lacks anyway).
        </li>
        <li>
          <strong>Typing and seen are cheap hints:</strong> typing is sent at
          most every 3 s and expires after 5 s without updates; seen is sent at
          most once a second with the newest message on screen. Losing one only
          delays a hint.
        </li>
        <li>
          <strong>Accessible, not noisy:</strong> new messages are announced
          through one polite status region, batched every second, so a burst
          reads as “50 new messages”, not 50 interruptions.
        </li>
      </ul>
    </>
  );
}
