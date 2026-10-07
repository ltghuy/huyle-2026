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
          Request an image only when it is about to be seen, show a
          placeholder of its exact shape until then, and reveal it once it is
          decoded. The gallery below loads generated photos from this
          project&apos;s mock API; switch between the hand-built loader, the
          browser&apos;s <code>loading=&quot;lazy&quot;</code> and eager
          loading, and compare what the server actually received.
        </p>
      </Intro>
      <KeyIdeas
        items={[
          { title: "Observe with a margin", text: "an IntersectionObserver whose root is the scroller, grown by a preload band, says when a tile is close." },
          { title: "Reserve the space", text: "give every tile its final aspect ratio before the image exists, so nothing moves when it arrives." },
          { title: "Decode, then reveal", text: "preload off-screen, await decode(), then show the same URL: no half-painted image, no second request." },
          { title: "Don't lazy-load what's visible first", text: "the first images load at once with high priority; fast scrolls skip or cancel the rest." },
        ]}
      />

      <ReadMore>
        <GuideSection title="Where you'd use it">
          <ul>
            <li>Galleries, feeds, product grids and long articles: many images, few on screen.</li>
            <li>Mobile and slow networks, where every unneeded image delays the ones you need.</li>
            <li>Pages whose largest paint is an image: priority loading for it, lazy for the rest.</li>
            <li>The same pattern applies to iframes, videos, maps and heavy components.</li>
          </ul>
        </GuideSection>

        <GuideSection title="How we built it">
          <p>
            Each photo is an SVG rendered by a route handler at four widths
            (320, 640, 960 and 1280 px; more detail, more bytes). The photo
            list carries each photo&apos;s size, dominant color and a tiny
            inline preview, so placeholders cost no request. Every image
            address includes a run id; the server holds the run&apos;s latency
            and failure rate and counts requests, bytes, failures and
            cancellations (a client that disconnects during the simulated
            latency), and pushes them to the counters over a server-sent
            event stream.
          </p>
          <p>
            <code>LazyLoader</code> is framework-free. Tiles register their
            box in a layout effect; the gallery then attaches one{" "}
            <code>IntersectionObserver</code> with{" "}
            <code>{"{ root: scroller, rootMargin: \"200px 0px\" }"}</code>.
            The root matters: <code>rootMargin</code> only grows the root, so
            with the default viewport root the scroller still clips tiles
            below its fold and nothing preloads. A tile entering the band
            while scrolling waits until scrolling has paused for the start
            delay; if it leaves first it is skipped. To load, an off-DOM{" "}
            <code>new Image()</code> gets <code>sizes</code> set to the
            tile&apos;s measured width and the <code>srcset</code>, so the
            browser picks the right candidate for that width and the screen
            density; after <code>onload</code> it awaits{" "}
            <code>decode()</code>, then the tile renders an{" "}
            <code>&lt;img&gt;</code> with the same <code>currentSrc</code>,
            which comes from memory (the response is cacheable, and each run
            and retry has its own address). Leaving the band mid-download
            clears <code>srcset</code>, which aborts the request.
          </p>
          <p>
            Each tile subscribes to its own state with{" "}
            <code>useSyncExternalStore</code>, so one image arriving re-renders
            one tile. Native and eager tiles use the same frame, placeholders
            and sizes, and report <code>onLoad</code> / <code>onError</code>{" "}
            to the same store, so only the loading strategy differs. Layout
            shift comes from the browser&apos;s <code>layout-shift</code>{" "}
            entries whose shifted nodes are inside the gallery.
          </p>
        </GuideSection>

        <GuideSection title="Best practices">
          <DoAvoid
            items={[
              {
                do: "Set width and height (or aspect-ratio) on every image and placeholder.",
                avoid: "Placeholders of a guessed height: each arrival pushes the tiles below, which can even push them out of range and cancel their loads.",
              },
              {
                do: "Load the first visible images eagerly with fetchpriority=\"high\".",
                avoid: "Lazy-loading the hero or first row: it waits for layout and the observer, delaying the largest paint.",
              },
              {
                do: "Use the scrolling container as the observer root when images live in one.",
                avoid: "A rootMargin on the viewport for a scroller: the margin never reaches past the scroller's clip.",
              },
              {
                do: "Await decode() before revealing, and reveal the URL that was preloaded.",
                avoid: "Swapping in a different URL or setting src on the visible img: a second request or a visible paint stall.",
              },
              {
                do: "Offer several widths with srcset and describe the slot with sizes.",
                avoid: "One 1280 px file for a 300 px tile: four times the bytes for no visible gain.",
              },
              {
                do: "Give every image real alt text and keep failed images retryable.",
                avoid: "Empty alt on content images, or a broken-image icon with no way to recover.",
              },
            ]}
          />
        </GuideSection>

        <GuideSection title="Try it with the demo controls">
          <ControlGuide
            items={[
              { control: "Strategy", watch: "Each pick starts a fresh run. Without scrolling, Eager requests all photos, Native lazy usually a few rows more than you see, Hand-built only the visible tiles and the preload band. The results table keeps the latest run of each." },
              { control: "Fly through", watch: "Hand-built with a start delay skips almost everything it passes (the Skipped counter); Native lazy and Eager download every photo." },
              { control: "Start delay: Off", watch: "With high latency, fly through: tiles start as they pass and are cancelled as they leave, and the server's Cancelled counter goes up." },
              { control: "Preload distance", watch: "None: images start only when they touch the viewport and you see placeholders while scrolling. 600 px: more requests, fewer visible placeholders." },
              { control: "Reserve space off", watch: "Scroll the gallery: Layout shift climbs above 0 for every strategy, and in Hand-built tiles get pushed in and out of range (more cancels)." },
              { control: "Placeholder", watch: "Blur-up and dominant color hint at the photo; skeleton is generic (static under reduced motion); None shows the reserved but empty box." },
              { control: "Priority images", watch: "0: the first row waits for the observer too. 3 or 6: those start immediately; compare Visible ready." },
              { control: "Failure rate", watch: "Failed tiles keep their shape with a Retry button; Retry failed retries all of them with fresh addresses. Set it back to 0 first to recover them all." },
              { control: "Latency", watch: "Applies to the next requests of the current run; at 0 the placeholders flash by, at 3000 ms you can watch each step." },
            ]}
          />
        </GuideSection>

        <GuideSection title="Trade-offs and limits">
          <ul>
            <li>Native <code>loading=&quot;lazy&quot;</code> is the right default for most pages: no JavaScript, works before hydration. Its distance is fixed by the browser and it never cancels; a hand-built loader earns its keep when you need those controls.</li>
            <li>JavaScript-driven images need the script to run first; for content that must show without it, render native lazy images or a <code>&lt;noscript&gt;</code> fallback.</li>
            <li>Cancelling on leave saves connections but costs a repeat request if the visitor scrolls back; on very slow networks keeping started downloads can be better.</li>
            <li>The browser allows about six connections per host over HTTP/1.1, so eager images queue behind each other (and would delay any other request, which is why the counters arrive over one stream opened before the images). That contention is what lazy loading and priority avoid.</li>
            <li>The photos are SVG; real photos need a server-side pipeline (AVIF/WebP, quality, resizing), which this demo doesn&apos;t cover.</li>
            <li>Layout shift is a per-run sum of the browser&apos;s scores (Chromium only), not the windowed CLS of Core Web Vitals, and the browser only scores shifts on screen: keep the gallery in view while you test it.</li>
          </ul>
        </GuideSection>
      </ReadMore>
    </>
  );
}
