---
id: "012"
feature: lazy-images
created: 2026-10-07
---

# Decisions: Lazy-Loaded Images

Decisions on gray areas and ambiguities. The user wasn't available for
discovery, so every decision below is an agent default chosen to fit the
practice rules (feature 001) and the brief.

## Resolved

### Where the images come from

- **Question:** How are images generated without external hosts? (agent default, not asked)
- **Decision:** A mock API route renders each photo as a seeded SVG landscape (sky gradient, sun, ridges, grain) at the requested width, with latency, jitter and failure injection. The amount of detail grows with the width, so wider candidates really cost more bytes. The photo list carries a tiny SVG preview and the dominant color for placeholders.
- **Rationale:** No binary encoder needed, deterministic per photo, small enough to generate per request, and the width label drawn in the corner makes the browser's `srcset` choice visible.
- **Caveats:** SVG decodes differently from JPEG; decode times are shorter than for real photos. Real pipelines use AVIF/WebP (out of scope, mentioned in the guide).

### Gallery viewport is a scrolling box

- **Question:** Does the gallery scroll with the page or in its own box? (agent default, not asked)
- **Decision:** Its own fixed-height scrolling box (about 70 % of the window, at most 640 px), used as the observer root.
- **Rationale:** On the practice page the gallery starts below the fold, so "first visible images" and "priority" would be meaningless with page scrolling; a box gives every run the same viewport, lets Reset and Fly through scroll it, and teaches the real gotcha that a margin only extends the observer's root, so a scroller must be the root.
- **Caveats:** Native lazy loading decides its own distance relative to the window and scroller; numbers reflect what the browser does.

### Strategies compared

- **Question:** Which strategies are compared? (agent default, not asked)
- **Decision:** Hand-built (observer + margin + start delay + cancel + decode), native `loading="lazy"` and eager. All three share the placeholders, sizes and space reservation.
- **Rationale:** The brief asks for a comparison with eager and native lazy; keeping everything else equal isolates the loading strategy.
- **Caveats:** Native lazy is shown as a comparison only, never as the solution.

### Counting requests and bytes on the server

- **Question:** How are requests, bytes and cancellations measured? (agent default, not asked)
- **Decision:** Every image address carries a run id; the server records requests, bytes served, failures and cancellations (client disconnects during the simulated latency) per run, and pushes them to the page over a server-sent event stream that is opened before the images start (a polled request queued behind in-flight images on HTTP/1.1's ~6 connections per host).
- **Rationale:** The page can't see native or eager fetches in flight, and resource timing doesn't report cancelled requests; the server sees all of them the same way.
- **Caveats:** Bytes are the uncompressed body size; a compressing proxy would send fewer.

### Default settings

- **Question:** Which defaults? (agent default, not asked)
- **Decision:** 48 photos, hand-built, Blur-up placeholder, preload 200 px, start delay 150 ms, 3 priority images, reserve space on, latency 600 ms (±25 % jitter), failure rate 0 %.
- **Rationale:** Enough photos to scroll several screens; latency high enough to see placeholders; priority 3 = the first row at three columns.
- **Caveats:** Photo count is selectable (24 / 48 / 96).

### Cancel on leaving, not on dwell only

- **Question:** What happens to an image that leaves the preload band while downloading? (agent default, not asked)
- **Decision:** It is cancelled and goes back to waiting; if it comes back it is requested again. An image whose download already finished is always shown.
- **Rationale:** Frees connections for the images the visitor stops at; the cost (a repeat request if they scroll back) is shown by the counters.
- **Caveats:** For very slow networks a "keep going once started" option could be better; noted in trade-offs.

### Start delay means "scrolling has paused"

- **Question:** What does the start delay measure? (agent default, not asked)
- **Decision:** A tile that enters the preload band while scrolling waits until scrolling has paused for the delay; tiles in range when the gallery opens start at once.
- **Rationale:** A per-tile dwell timer didn't skip anything at fly-through speed (a ~1000 px band is crossed in ~300 ms); waiting for a scroll pause is what "skip what the visitor flies past" needs.
- **Caveats:** During a long, slow, continuous scroll nothing new starts until the visitor pauses; the preload band hides that for normal scrolling.

### Retry

- **Question:** Automatic or manual retry? (agent default, not asked)
- **Decision:** Manual: a Retry button per failed tile and "Retry failed" in the controls; each retry uses a new address.
- **Rationale:** Makes the failure state visible and testable; automatic retry with backoff is discussed in the guide.
- **Caveats:** None.

### Layout-shift metric

- **Question:** How is layout shift measured? (agent default, not asked)
- **Decision:** The browser's layout-shift entries whose shifted elements are inside the gallery, summed per run, including entries flagged as following recent input (the click that started a run would otherwise hide the first shifts at low latency). Browsers without the API show "not supported".
- **Rationale:** Measured, not estimated; scoped so the rest of the page can't pollute it.
- **Caveats:** It is a per-run sum, not the session-windowed CLS of Core Web Vitals.

### Visual direction

- **Question:** Which visual style? (agent default, not asked)
- **Decision:** The playground's existing shadcn tokens in both themes (the design-system search suggested a dark-only developer style; the project rule is to map to existing tokens and keep both themes). Photo grid with rounded tiles and captions, a compact counter bar above the gallery, a results table below it.
- **Rationale:** Consistency with the other practices; the photos provide the color.
- **Caveats:** None.

## Tentative

None.
