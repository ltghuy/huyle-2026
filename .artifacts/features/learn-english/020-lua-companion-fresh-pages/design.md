# Design: Lửa companion and fresh study pages (020)

## Lửa (`src/components/mascot/lua.tsx`)

- Server-safe component: `<Lua mood="happy|cheer|think|sleepy" size={n} label? className? />`. Inline SVG, viewBox 0 0 120 140.
- Body: one flame path (a main tip and a small side tip) filled with a vertical gradient from coral (top) to amber, and a cream inner flame. Lửa keeps this fixed palette in both themes: with the theme's `--streak` it turned brown in light mode. Only the "?" (`--primary`) and "z" (`--muted-foreground`) follow the theme. Gradient ids come from `useId()` so several Lửa can share a page.
- Face: eyes and mouth in `var(--foreground)`-independent dark ink (`oklch(0.2 0 0)`) so it reads on the warm body in both themes; cheeks in a translucent pink.
  - happy: round eyes, small smile
  - cheer: closed "^ ^" eyes, open smile, two little arms up and sparkles
  - think: eyes looking up-left, small "o" mouth, a "?" spark
  - sleepy: closed curved eyes, small flat mouth, "z" marks, body slightly lower
- Motion: a CSS class `lua-sway` (rotate ±3° around the bottom, 3 s ease-in-out infinite) inside `@media (prefers-reduced-motion: no-preference)` in `globals.css`.
- Accessibility: `aria-hidden` by default; with `label`, `role="img"` and `<title>`.

## Compact hero (`PageHero` size `sm`)

- Same glow, pill and gradient title as home/profile, but left-aligned in a row: text on the left, Lửa (96 px, 72 px on phones) on the right. Title `text-3xl md:text-4xl`. Prop `mascot?: ReactNode`.
- Replaces `PageHeader` on the five pages. `PageHeader` stays for the other pages.

## Empty and error states (`components/shell/load-states.tsx`)

- `EmptyState` gets `mood?: LuaMood`: when set, it shows Lửa (72 px) instead of the icon; the dashed box becomes a soft `bg-card` panel with `rounded-2xl`. `ContentError` shows a sleepy Lửa.
- Call sites on the five pages pass a mood; other pages keep their icon until they opt in.

## Level colours

- Tokens `--level-a1` … `--level-c1` (green, teal, blue, violet, pink) in light and dark in `globals.css`, exposed as `--color-level-*`.
- `LevelBadge` (`components/shell/level-badge.tsx`): `rounded-full`, `bg-level-x/15 text-level-x`, `font-semibold`, used for the level headings in Ngữ pháp, the level column in Động từ bất quy tắc and the level strip in Từ vựng.

## Home streak

- `StreakSummary` shows Lửa (48 px) in the streak card: mood from `streak` and whether today is attended (the attendance rows already loaded there).

## Risks

- Gradient text and SVG gradients need the theme variables at runtime: both use CSS variables, no JS.
- Card sizes must not shift: Lửa has fixed width and height.
