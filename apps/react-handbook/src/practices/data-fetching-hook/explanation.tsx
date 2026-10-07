export function Explanation() {
  return (
    <>
      <p>
        One module-level cache holds an entry per key (hashed with object
        properties sorted, so <code>{"{a,b}"}</code> and <code>{"{b,a}"}</code> are
        the same). <code>useQuery</code> reads it with{" "}
        <code>useSyncExternalStore</code>, and its <code>subscribe</code> doubles as
        observer registration: React mounting, unmounting or switching keys is
        what tells the cache who uses what.
      </p>
      <ul>
        <li>
          <strong>Stale-while-revalidate:</strong> cached data is returned
          immediately; if it&apos;s older than the stale time, a background
          refresh runs and <code>isFetching</code> is reported separately from
          the first load.
        </li>
        <li>
          <strong>Dedupe and races:</strong> concurrent users of a key share one
          promise. Every request gets a token; a response is stored only if its
          token is still current, and cancelling bumps the token and aborts.
          A component that switched keys reads the new key, so a late reply
          can&apos;t reach it.
        </li>
        <li>
          <strong>Retries:</strong> waits of ~1 s, 2 s, 4 s (±25 % jitter, capped at
          30 s); 4xx errors aren&apos;t retried; offline requests pause until{" "}
          <code>online</code>.
        </li>
        <li>
          <strong>Cleanup:</strong> when a key loses its last user, the request is
          cancelled and a removal timer starts (gc time); a new user cancels it.
          Focus and reconnect refresh stale keys in use, at most every 5 s.
        </li>
        <li>
          <strong>Optimistic edits:</strong> cancel refreshes for the affected keys,
          remember the previous field values, write the new ones into every key,
          send the request. On failure, revert only fields that still hold this
          edit&apos;s value (so an overlapping edit survives), then refresh from
          the server.
        </li>
      </ul>
    </>
  );
}
