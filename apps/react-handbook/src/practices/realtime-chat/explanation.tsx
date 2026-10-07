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
          A live chat room: messages from others appear the moment they&apos;re
          sent, yours show up before the server confirms them, and the view only
          follows new messages while you&apos;re reading the bottom. The hard
          parts are invisible in the happy path: dropped connections, duplicate
          or missing messages, and scrolling that jumps under the reader.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "One order for everyone", text: <>the server numbers every message (<code>seq</code>); every tab sorts and de-duplicates by it.</> },
          { title: "Optimistic, but honest", text: "your message appears instantly, and a failed send stays visible with Retry." },
          { title: "Resume, don't restart", text: "after a drop the client asks for “everything after my last message”." },
          { title: "Scroll that respects the reader", text: "follow new messages only at the bottom; older history loads without a jump." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Team and customer-support chat, comment threads that update live.</li>
            <li>Activity feeds and logs that stream in while someone reads them.</li>
            <li>Any “live” screen on a flaky network: mobile users switch networks and close laptops all the time.</li>
            <li>Collaborative tools that need everyone to see the same sequence of events.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            Messages arrive over one long-lived Server-Sent Events response, and
            are sent with normal <code>POST</code> requests. The stream is read by
            hand with <code>fetch</code> and a small parser instead of{" "}
            <code>EventSource</code>, so reconnecting is our code: delays that
            double from 0.5 s up to 15 s with random jitter, a pause while
            offline, and a server ping every 15 s so a silently dead stream is
            noticed after 35 s. Every reconnect asks for{" "}
            <code>after=&lt;last seq&gt;</code>; the server replays what was
            missed, or sends a reset with the latest page if you were away
            longer than its 500-message window.
          </p>
          <p>
            Each message you send gets an id from your browser first. It shows
            right away, and whichever arrives first, the server&apos;s echo on
            the stream or the <code>POST</code> response, turns it into the real
            message in place. Sends go out one at a time so your messages keep
            the order you typed them, and Retry reuses the same id, so the server
            never stores a message twice. Unsent messages are kept in{" "}
            <code>localStorage</code> and come back after a reload.
          </p>
          <p>
            The message list tracks whether you&apos;re within 48 px of the
            bottom. Only then do new messages scroll it, before paint. When
            older messages load above, the message you were reading is put back
            exactly where it was. New messages are announced through one
            screen-reader status region, batched once a second.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: "Give every message a server sequence number and de-duplicate by it.",
                avoid: "Trusting arrival order or timestamps: replays, retries and echoes will duplicate or reorder messages.",
              },
              {
                do: "Make sends idempotent with a client-generated id, and keep failed messages on screen with Retry and Discard.",
                avoid: "Retrying with a new id (duplicates after a lost response) or silently dropping text the user typed.",
              },
              {
                do: "Reconnect with growing, randomized delays, stop while offline, and resume from the last message you have.",
                avoid: "Reconnecting in a tight loop, or reloading the whole conversation after every drop.",
              },
              {
                do: "Auto-scroll only when the reader is at the bottom, and keep their place when content is added above.",
                avoid: "Yanking the view to the newest message while someone is reading older ones.",
              },
              {
                do: "Announce new messages through one polite region, summarized during bursts.",
                avoid: "Making the whole list a live region: a burst becomes 50 interruptions.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Latency", watch: "Set 5000 ms and send: your message appears instantly as “Sending…”, then turns “Delivered” in place, never twice." },
              { control: "Send / history failure", watch: "At 100%, some sends show “Not sent” with Retry and Discard; others still succeed because the server stored them but the response was lost. Retry at 0% delivers each exactly once." },
              { control: "Simulated people", watch: "Normal: bots type, post, reply to you and mark your messages “Seen”. Off: a quiet room for testing on your own." },
              { control: "Burst (50 messages)", watch: "Scroll up first: the view doesn't move, an “N new messages” button appears, and the “New” divider marks where unread starts." },
              { control: "Drop connection", watch: "The badge goes Reconnecting, then Live; Stream stats count the messages replayed while you were away. Press it several times quickly to see the delay grow." },
              { control: "Go offline", watch: "Sends fail at once with “You're offline”; after 10 s a “Connection lost” toast appears. Switch it back: missed messages fill in and a “Reconnected” toast shows." },
              { control: "Clear conversation", watch: "Empties the room for everyone. Every tab shows “Conversation cleared by …” and a toast, including a tab that was offline when it happened." },
              { control: "Open another tab", watch: "Put the tabs side by side: messages, typing and “Seen” cross between them, and each tab shows only its own messages as “You”." },
              { control: "Scroll to the top", watch: "Older messages load in pages of 30 without moving what you're reading, until “Beginning of conversation”." },
              { control: "Stream stats", watch: "Live counters for messages received, replayed after a reconnect, duplicates dropped and resets: the numbers behind each experiment." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>One room, plain text only: no direct messages, editing, reactions, attachments or sign-in.</li>
            <li>The room lives in server memory and resets when the server restarts.</li>
            <li>No list virtualization (that&apos;s practice 7); a long session keeps every message in the page.</li>
            <li>Unsent messages are kept per browser, so two tabs both restore them; a tab that missed two clears gets one notification.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
