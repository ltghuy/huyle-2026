---
id: 004
feature: appearance-settings
type: brownfield
scope: medium
status: done
branch: feature/learn-english
created: 2026-10-27
---

# Feature: Appearance settings (mode and main colour)

## Overview

The app always follows the device's light or dark setting and always uses indigo as its main colour. The owner wants learners to choose light or dark mode and a main colour themselves in Settings.

## Goals

- [x] A learner can switch between light, dark and the device setting, and pick one of five main colours, from Settings
- [x] The choice applies straight away on every page and is still there on the next visit, without a flash of the old look on load

## Out of Scope

| Feature | Reason |
|---------|--------|
| Free colour picker | A short list of tested colours keeps text readable on buttons in both modes |
| Syncing the look across devices | It's a device preference like the sound switch; backups and sync carry learning progress |
| Changing the success (green) and error (red) colours | They carry meaning in exercise feedback and must stay recognisable |

## User Stories

### P1: Choose light or dark mode

- As a learner, I want to choose light or dark mode so that the app is comfortable to read where I study
- **Why P1:** Asked for directly
- **Independent Test:** In Settings pick "Tối": the page turns dark at once and stays dark after a reload, whatever the device setting

**Acceptance Criteria:**

- [x] AC-001: WHEN the learner opens Settings THEN system SHALL show a "Giao diện" card with a mode choice of "Sáng", "Tối" and "Theo thiết bị", with the current choice selected ("Theo thiết bị" by default)
- [x] AC-002: WHEN the learner picks a mode THEN system SHALL apply it to the whole app at once and keep it in this browser for later visits

### P1: Choose the main colour

- As a learner, I want to pick the app's main colour so that it feels like mine
- **Why P1:** Asked for directly
- **Independent Test:** Pick "Hồng": buttons, links, focus rings and the active menu item turn pink in both modes, and stay pink after a reload

**Acceptance Criteria:**

- [x] AC-003: WHEN the learner opens the "Giao diện" card THEN system SHALL show five main colours as labelled swatches ("Chàm", "Xanh dương", "Xanh ngọc", "Cam", "Hồng"), with the current one marked ("Chàm" by default)
- [x] AC-004: WHEN the learner picks a colour THEN system SHALL use it for buttons, links, focus rings, progress bars and the active menu item in light and dark mode at once, with button text that stays readable (at least 4.5:1 contrast)
- [x] AC-005: WHEN a page loads after a colour was chosen THEN system SHALL show that colour from the first paint, with no flash of the default colour

## Edge Cases

- WHEN browser storage is blocked THEN system SHALL still apply the chosen mode and colour for the open tab and fall back to the defaults on the next visit
- WHEN a stored colour isn't one of the five (an old or edited value) THEN system SHALL use the default colour
- WHEN the mode is "Theo thiết bị" and the device switches between light and dark THEN system SHALL follow it

## Success Criteria

- [x] Every mode and colour combination keeps primary button text at 4.5:1 contrast or better
- [x] A reload after picking "Tối" and "Cam" shows a dark, orange page from the first frame

## Evidence

- AC-001, AC-002: `src/components/settings/appearance-setting.test.tsx` (default "Theo thiết bị", "Tối" adds the dark class and is stored, can't be un-pressed, "Sáng" removes it)
- AC-003, AC-004: same test (five labelled colours, "Chàm" by default, a pick sets `data-accent` and is stored); contrast computed from the oklch tokens: light buttons 5.0–6.2:1, dark 6.3–10.6:1
- AC-005: `src/lib/appearance.test.ts` (pre-paint script applies only known values); Playwright 2026-10-27 with every app script blocked: after a reload `<html>` already had `dark` and `data-accent="orange"`, and no hydration warnings appeared
- Screenshots checked in light and dark (Settings card, placement screen in dark orange)
- Fix 2026-10-27: the active and hover menu item kept indigo (`--sidebar-accent` wasn't overridden); each colour now sets it, and its text contrast is 4.9–6.3:1 in light mode and 10.4–11.6:1 in dark. Checked in sidebar screenshots, dark orange and light pink
- Gates 2026-10-27: lint, typecheck, 523 unit tests, build

## Open Questions

- None

## Notes

Requested 2026-10-27 by the owner: "allow user choose the Mode (Light, Dark) and primary color". "Theo thiết bị" stays as a third option because it is today's behaviour and the default. Colour names are Vietnamese like the rest of the UI.

## Baseline

### Current Behavior

- The app follows the device's light or dark setting and has no control for it. The main colour is always indigo.

### Gaps / Limitations

- A learner who wants dark mode on a light device (or the reverse) can't have it, and can't change the colour.
