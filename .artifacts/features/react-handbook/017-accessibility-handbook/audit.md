---
id: "017"
feature: accessibility-handbook
audited: 2026-10-08
result: passed
---

# Audit: Accessibility Handbook

Evidence comes from a production build (`pnpm build && pnpm start -p 3123`) in headless Chrome:
- the Puppeteer MCP for clicks and DOM reads;
- Puppeteer scripts with real Tab / Shift+Tab / Enter key presses and typing, `emulateMediaFeatures` for reduced motion, axe-core 4.10.2 in both themes, and a 360 px viewport.

Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: One click from sidebar, home, section page; both pages written | Met | The sidebar folder links Performance and Accessibility (no coming-soon mark). The section page says "2 of 2 pages written" with both cards marked Written. The home card shows "2 of 2 pages written" |
| G2: Ten short topics, each demo reacts | Met | 1,953 words of prose outside the demos (including headings, the table of contents and Do/Avoid). Every topic has an intro, 3–5 points, a demo, Do/Avoid and module links. Demo results are in SC1 |
| G3: All 13 content-design modules linked | Met | Links: aria-html, structure, more-html, focus, javascript, images, video-audio, color-contrast, typography, motion, forms, patterns, design-ux; plus welcome and the three testing modules |
| G4: Readings come from the real DOM, labelled simplified | Met | Every "screen reader" line, outline, tab order and annotation table is computed by the reader from the demo's elements at that moment (it changes when the markup changes), and each is labelled "simplified" |
| SC1: Every demo reacts | Met | See the demo results table below |
| SC2: ~15-minute read (< ~2,000 words) | Met | 1,953 words |
| SC3: 0 serious/critical axe, both themes; no sideways scroll at 360 px | Met | With the default (correct) versions, only the moderate `region` finding from the shell (feature 001) remains in light and dark. `scrollWidth` is 360 in both themes |

## SC1 demo results

| Demo | Result |
|------|--------|
| Semantics | Div: tabIndex −1, announced as plain text, Enter does nothing (1 pointer, 0 keyboard). ARIA div and button: "Save, button", Enter counted as keyboard |
| Structure | Meaningful: title, `en`, 4 landmarks (banner, navigation “Main”, main, contentinfo), h1/h2/h2, no problems. Generic boxes: no title, no language, 0 landmarks, 0 headings, four problems listed. Skipped: "Heading level skipped: h2 → h4 (Holidays)" |
| Keyboard focus | Real Tab visits Skip to content → Home → Menu → Hours; Enter on the skip link focuses the content, next Tab is "Order now". `tabindex="1"` puts "Order now" first in the computed order. Hiding the outline leaves the focused link with `outline: none` and no box-shadow; with it shown the ring is a 3 px box-shadow |
| Dynamic content | Live region off: "Nothing announced". On: "Announced: “Added a sourdough loaf. Your basket has 4 items.”". Disclosure: "Delivery details, button" without `aria-expanded`, "…, button, collapsed/expanded" with it |
| Alt text | Empty informative: hidden + "listeners miss…"; "Image of a chart": redundant + missing fact; "sales_chart_final.png": file name; decorative + empty: OK; link + empty: "unlabelled, link"; link + "Sales report": OK |
| Media | Recorded video with sound: captions (A), audio description (AA), transcript and sign language recommended. Live video: live captions (AA) |
| Contrast | #949494/#fff 3.03:1 fails normal text, passes large; #767676/#fff 4.54:1 passes AA; #e5e5e5/#171717 14.23:1 passes AAA. Grayscale applies `grayscale(1)`; the two borders (#3d8f3d, #f05a5a) have equal luma |
| Typography | Fixed card: text spacing hides 20 px (1280 px wide) / 62 px (360 px); 200% hides 369 / 415 px. The growing card always reports all text visible |
| Motion | Banner moves; after 5 s it shows the pause-control note (10.2 s measured). Simulated or system reduced motion: static list, 0 running animations |
| Forms | Accessible: "Email, edit text, required, We send the receipt here."; empty submit focuses the 3-problem summary; email then reads "…, invalid entry, … Enter an email address like name@example.com."; radio reads its group and error. Inaccessible: "Full name, edit text ← name comes from the placeholder" |
| Annotations | Table: region “Get the weekly menu” (aria-labelledby), heading level 4, then 1 Dismiss (aria-label), 2 Email (label), 3 checkbox (label), 4 Subscribe, 5 Privacy notice |

## Known minor issues (not blocking)

- Choosing the deliberately broken versions (positive tab index, missing alt, low-contrast preset, inaccessible form, generic-box sample) makes axe report those issues; each is marked "the wrong way, on purpose" (decisions).
- The reader covers a subset of the accessible-name algorithm; real screen readers word things differently, as the page says.
