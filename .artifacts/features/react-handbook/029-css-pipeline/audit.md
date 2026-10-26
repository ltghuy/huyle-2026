---
id: "029"
feature: css-pipeline
created: 2026-10-13
---

# Audit: The CSS pipeline

## Goals

- [x] Five topics with working demos (delivery, Sass, PostCSS, CSS Modules, Tailwind), all exercised by a Puppeteer script with no console errors.
- [x] Real tools run in the browser on the reader's input: PostCSS 8.5 (tree, plugins, parse errors) and Tailwind 4.3.3 (real output; lazy chunks requested only when the demos near the viewport). The Sass stand-in is labelled and matched Dart Sass 1.93.2 on all page samples plus 11 extra cases (14/14).
- [x] Cascade effects come from a real browser: injected CSS painted unstyled at 16-20 ms with styles at ~911 ms; global CSS rendered both titles rgb(65, 105, 225), CSS Modules rendered crimson and royalblue (read with getComputedStyle).

## Success Criteria

- [x] Sass stand-in output equals Dart Sass for every page sample (whitespace-normalized).
- [x] axe clean light/dark at 1280 and 360 px with demos opened; no horizontal overflow.
- [x] typecheck, lint, build pass.

## Notes

- Headless Chrome deferred the first paint of the static extracted-CSS frame by 1-2.4 s (no long tasks on the parent); the verdict (styled before first paint) is still correct, and the demo now explains late or missing paints (background tab / off-screen frame) instead of reporting a misleading flash.
- The Tailwind dynamic-class example (`bg-${color}-500`) is not generated; replacing a class with the full name generates it.
- New dependencies: postcss ^8.5.29; tailwindcss moved to dependencies (^4.3.3).
