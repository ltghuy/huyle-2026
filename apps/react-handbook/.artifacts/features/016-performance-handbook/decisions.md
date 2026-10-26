---
id: "016"
feature: performance-handbook
created: 2026-10-08
---

# Decisions: Performance Handbook

The user asked for a short Performance handbook under Performance &
Accessibility, based on web.dev *Learn Performance*, focused on main concepts
and demonstrations. They said no quick task and no separate "section" feature:
this feature covers both opening the section and the page. Gray areas were
settled without asking.

## D1: One page, five topics (agent default, not asked)

- **Decision:** one Performance page with five topics: Why speed matters (Core Web Vitals), Critical path & resource loading, Images & layout shift, Code splitting & prefetching, Long tasks & web workers.
- **Why:** the user asked for the main concepts, not the full 14 modules; these five group them and each has a demo the browser can show for real (except the waterfall, see D3).

## D2: Accessibility listed as coming soon (agent default, not asked)

- **Decision:** the folder lists Accessibility with a coming-soon placeholder page.
- **Why:** the user first asked for two sub pages, then narrowed the work to Performance; listing it keeps the folder's shape without writing its content.

## D3: Critical-path waterfall is simulated (agent default, not asked)

- **Decision:** a deterministic model of a sample page's requests, labelled "simulated".
- **Why:** real render blocking can't be shown safely inside the running app; the learner's own load is shown by the live vitals instead (and DevTools is linked).

## D4: Live numbers from the learner's browser (agent default, not asked)

- **Decision:** vitals, layout shift, resource sizes and long tasks are read from the browser's performance APIs on this page; nothing is faked.
- **Why:** matches the handbook's "measure, don't guess" rule from practice 14.

## D5: Cover every module, still briefly (user request)

- **Decision:** after the first version the user asked to fill the gaps against the course's 14 modules, "and don't forget CDN". Added a topic on HTML delivery and CDNs (simulated demo), a fonts topic (simulated `font-display` demo), video and iframe/facade lazy loading notes, `dns-prefetch`, Speculation Rules, and switched the worker demo to blurring an image (the course's concrete use case is image processing in a worker).
- **Why:** each module now has at least its main points; the page stays short (prose under ~1,800 words).

## D6: Image blur instead of prime counting (agent default, not asked)

- **Decision:** the long-task demo blurs a generated photo with a box blur; chunks are row bands; the worker gets the pixel buffer as a transferable and sends it back the same way.
- **Why:** a realistic worker job that also shows transferables (no copy), and the result is visible; a checksum proves all three modes produce the same image.
