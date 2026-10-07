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
          A serious uploader: drop, pick or paste files (or a whole folder),
          see each one checked before anything is sent, and watch real
          progress, speed and time left. Files go up in pieces, so a pause, a
          failure or even a reload only costs the piece in flight, never the
          whole file.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "Pieces at a confirmed offset", text: "the server says how much it has; the client only ever continues from there." },
          { title: "Honest progress", text: "the solid bar is what the server stored; the light part is still in flight." },
          { title: "A queue, not a stampede", text: "only a few files upload at once; pause, resume, cancel and retry each one." },
          { title: "Trust, but verify", text: "a SHA-256 checksum proves the stored copy matches the original." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Attachments, profile photos and document uploads in any web app.</li>
            <li>Large media or backup files where restarting a 2 GB upload after a hiccup isn&apos;t acceptable.</li>
            <li>Bulk imports: dropping a folder of hundreds of files without freezing the page.</li>
            <li>Mobile users on flaky networks, who switch connections or lock their phone mid-upload.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            Files arrive from a drop (folders are walked with{" "}
            <code>webkitGetAsEntry()</code>, reading every batch of entries), the
            file picker, or a paste. Each one is checked against the rules (type
            by MIME or extension, size, empty, how many) before any byte is sent,
            and the server checks the same rules again. Images get a thumbnail
            from <code>URL.createObjectURL</code>, released when the row goes
            away.
          </p>
          <p>
            Uploading is a small protocol of our own: create an upload, then send
            pieces with <code>PUT ?offset=N</code>, then complete it with the
            file&apos;s SHA-256. The server only confirms a piece once it is
            stored, and answers a wrong offset with the offset it really has, so
            a retry after a lost response never stores anything twice. Pieces
            are sent with <code>XMLHttpRequest</code> because <code>fetch()</code>{" "}
            has no upload-progress events, and <code>abort()</code> makes pause
            and cancel instant.
          </p>
          <p>
            A module-level store runs a queue: at most N files upload at once,
            failed pieces retry with growing, randomized delays (up to 12 tries),
            offline uploads wait for the network, and the store survives
            navigation. Speed and time left come from confirmed bytes: the
            browser reports the first couple of megabytes as “sent” instantly
            because they sit in socket buffers. The demo&apos;s speed limit is
            real: the server reads the request slowly, so the browser is held
            back by the network, not by a fake timer.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: "Send large files in pieces and let the server own the offset.",
                avoid: "One request per file: any failure or pause starts the whole file over.",
              },
              {
                do: "Show progress from bytes the server confirmed, and estimate time from that rate.",
                avoid: "Trusting upload-progress events alone: buffers make them race ahead, then the bar jumps back on failure.",
              },
              {
                do: "Validate on the client for fast feedback, and again on the server.",
                avoid: "Relying on the browser's checks, or on the file's name, for anything that matters.",
              },
              {
                do: "Limit how many files upload at once and keep the rest queued.",
                avoid: "Starting 100 uploads together: they fight over bandwidth and nothing finishes early.",
              },
              {
                do: "Keep the drop zone usable without a mouse (real buttons for picking files) and announce results, not every percent.",
                avoid: "A drop-only zone, or a live region that reads out every progress update.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Add sample files", watch: "Six files appear: four upload and verify, “empty.txt” and “setup.exe” are rejected with the reason before anything is sent." },
              { control: "Upload speed", watch: "At 256 KB/s a 4 MB file takes about 16 s; the shown speed settles near 256 KB/s and the time left counts down accurately. Files uploading together share the speed." },
              { control: "Piece failure", watch: "At 50%, rows show “Retrying (try N of 12)” but still finish verified; only failed pieces are sent again." },
              { control: "At once", watch: "Drop more files than the limit: the rest show “Queued #N”. Lower it while uploading and the extra files finish their current piece, then wait." },
              { control: "Piece size", watch: "Smaller pieces make the solid bar move more often; larger ones mean fewer requests but more to resend after a failure." },
              { control: "Max file size / Max files / Allowed types", watch: "Apply to files added afterwards, here and on the server; files over the limits are listed as “Not added” with the reason." },
              { control: "Pause / Resume / Cancel / Retry", watch: "Pause stops the network at once and frees the slot; Resume continues from the server's offset (at most one piece is sent again); Cancel also deletes what the server received." },
              { control: "Pause all / Resume all / Cancel all / Clear finished", watch: "Act on every file they concern; Clear finished removes done and rejected rows only." },
              { control: "Choose a folder, drop a folder, or paste", watch: "Every file inside, including subfolders, is added with its path; a pasted screenshot uploads like a dropped file." },
              { control: "Reload the page mid-upload", watch: "The file shows “Interrupted” with its progress; add the same file again and it continues from where it stopped." },
              { control: "Uploaded files on the server", watch: "Each finished file with size, time and “Checksum matches”; delete removes it from the server. Storage is capped at 200 MB, oldest first." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>Our own small protocol instead of a standard one, so it is easy to read; a production app would likely use a resumable-upload standard or a storage service&apos;s multipart API.</li>
            <li>Resuming after a reload needs the user to add the same file again: browsers don&apos;t keep file access across reloads.</li>
            <li>Files live in a temp folder for the session (cleared when the server starts); no processing, sharing or virus scanning.</li>
            <li>The checksum is computed from the whole file in memory, which is fine at 50 MB but would need streaming hashing for very large files.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
