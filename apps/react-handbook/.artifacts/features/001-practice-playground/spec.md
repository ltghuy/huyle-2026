---
id: "001"
feature: practice-playground
type: greenfield
scope: large
status: done
branch: main
created: 2026-10-06
---

# Feature: React Practice Playground (Shell)

## Overview

A senior frontend engineer wants to sharpen their skills by building 14
classic frontend problems from scratch, with no third-party libraries for
the core logic of each problem. Right now there is no place to host,
browse, and compare these exercises. This feature delivers the **playground
shell**: one place where every practice is listed in a left sidebar and the
selected practice's live demo is shown on the right. Each practice is then
built as its own follow-up feature (002–015) and plugs into this shell.

The shell is the **Frontend Handbook** (quick task 004; renamed from "Frontend Interview Handbook" in quick task 005): content is
grouped into sections. "React Practices" holds the 14 practices below;
"Browser & Web Platform" (features 018–020: Networking; Origins, DNS and CORS; How the browser renders a page) and "Performance &
Accessibility" (features 016 and 017: Performance, Accessibility) and "Security"
(features 021–022: JSON Web Tokens; XSS, CSP and CSRF) and "Frontend System Design"
(feature 023: The design method) are folders of handbook pages.

The practice catalog, in sidebar order:

1. Toast / Notification System
2. Searchable Accordion
3. Infinite Scroll
4. Custom Data-Fetching Hook with Caching
5. Real-Time Chat UI
6. File Upload with Progress
7. Virtualized Large Lists
8. Accessible Modal
9. Context + Reducer State Management
10. Multi-Step Form
11. Lazy-Loaded Images
12. Debounced Search + API Cache
13. Advanced Data Grid
14. Large Dataset Performance Optimization

## Goals

- [x] All 14 practices can be reached from a persistent left sidebar in one click.
- [x] Every practice has its own shareable address that opens it directly, including after a page refresh.
- [x] Every practice page has the same layout: title, short explanation, demo controls, live demo.
- [x] Adding a newly built practice to the playground takes only that practice's own work: no changes to the sidebar, the overview, or other practices.

## Out of Scope

| Feature | Reason |
|---------|--------|
| The 14 practice demos themselves | Each one is its own feature (002–015) with its own spec |
| User accounts, saving progress, persistence | Personal learning tool; nothing to save |
| Showing source code inside the app | Not requested; the source is in the repository |
| Automated test suite | Not requested for this phase |
| Internationalization | English only |

## User Stories

### P1: Browse practices from the sidebar

- As a learner, I want a left sidebar listing all 14 practices so that I can switch between exercises instantly.
- **Why P1:** This is the core navigation; nothing else is reachable without it.
- **Independent Test:** Open the playground, click each of the 14 sidebar items in turn, and confirm the right side shows that practice's title each time.

**Acceptance Criteria:**

- [x] AC-001: WHEN the playground opens THEN system SHALL show a left sidebar with the handbook's sections; the React Practices section SHALL be a folder that opens to list all 14 practices in catalog order, each with its number and name (open whenever a practice is shown), and sections without content SHALL be listed as coming soon.
- [x] AC-002: WHEN the user selects a sidebar item THEN system SHALL show that practice in the right-hand area without a full page reload.
- [x] AC-003: WHEN a practice is open THEN system SHALL visually mark its sidebar item as the current one and expose it as the current page to assistive technology.
- [x] AC-004: WHEN a practice isn't built yet THEN system SHALL still list it in the sidebar, marked "coming soon", and selecting it SHALL show a placeholder with its title and description.
- [x] AC-005: WHEN the user navigates the sidebar with the keyboard only THEN system SHALL let them reach and open every item with visible focus.

### P1: Direct, shareable address per practice

- As a learner, I want each practice to have its own address so that I can bookmark it, refresh it, and use browser back/forward.
- **Why P1:** Building one practice takes many refreshes; losing the selection on every refresh would make the playground unusable for its main purpose.
- **Independent Test:** Open a practice, refresh the browser, and confirm the same practice is still shown; then use Back and confirm the previous practice comes back.

**Acceptance Criteria:**

- [x] AC-006: WHEN the user opens a practice's address directly (under its section, `/react-practices/{practice}`) THEN system SHALL show that practice with its sidebar item marked current; WHEN an older address (`/practices/{practice}`) is opened THEN system SHALL permanently redirect to the new one, keeping any query string.
- [x] AC-007: WHEN the user uses browser back/forward THEN system SHALL show the matching previously viewed practice.
- [x] AC-008: WHEN the user opens an address for a practice that doesn't exist THEN system SHALL show a not-found message with a way back to the home page.
- [x] AC-009: WHEN a practice page is open THEN system SHALL use the practice's name as the browser tab title.

### P1: Consistent practice page layout

- As a learner, I want every practice page to have the same structure so that I always know where the explanation, controls, and demo are.
- **Why P1:** All 14 follow-up features depend on this frame; it must exist before any of them is built.
- **Independent Test:** Open any practice and confirm it shows title, explanation, controls area, and demo area in the same positions as every other practice.

**Acceptance Criteria:**

- [x] AC-010: WHEN a practice page is open THEN system SHALL show, in order: the title and one-line summary, a practice guide (a short intro to the pattern and its key ideas, with a "Read more" control that expands the full guide: use cases, approach, best practices, how to use the demo controls, trade-offs), a demo-controls area, and the live demo area. *(Guide format updated by quick task 002-practice-guides.)*
- [x] AC-011: WHEN a practice defines no demo controls THEN system SHALL hide the controls area instead of showing it empty.
- [x] AC-012: WHEN the user switches between practices THEN system SHALL only load the content of the practice being opened, not all 14.
- [x] AC-013: WHEN a practice's demo hits an unexpected error THEN system SHALL show an error message with a retry action inside the demo area, while the sidebar and the rest of the playground keep working.

### P2: Overview landing view

- As a learner, I want a home page introducing the handbook and its sections, and a section page summarizing every practice and its build status, so that I can see my progress and pick what to do next.
- **Why P2:** Useful orientation, but the sidebar alone already makes every practice reachable.

**Acceptance Criteria:**

- [x] AC-014: WHEN the user opens the home page THEN system SHALL introduce the handbook and show a card per section (title, summary, status); WHEN the user opens the React Practices section THEN system SHALL list all 14 practices with name, one-line description, and status (built / coming soon).
- [x] AC-015: WHEN the user selects a section on the home page THEN system SHALL open it (coming-soon sections aren't links); WHEN the user selects a practice on the section page THEN system SHALL open that practice; a practice page SHALL show where it sits (Handbook › React Practices).
- [x] AC-016: WHEN the home page or the React Practices section is shown THEN system SHALL show how many of the 14 practices are built.

### P2: Small-screen layout

- As a learner on a narrow screen, I want the sidebar to become a slide-in panel so that the demo gets the full width.
- **Why P2:** The main use is desktop, but several practices (chat, image loading, infinite scroll) are worth checking at phone width.

**Acceptance Criteria:**

- [x] AC-017: WHEN the viewport is narrower than a tablet THEN system SHALL hide the sidebar behind a menu button and give the content area the full width.
- [x] AC-018: WHEN the user opens the menu THEN system SHALL slide in the practice list, move focus into it, and let Escape or an outside click close it, returning focus to the menu button.
- [x] AC-019: WHEN the user picks a practice from the slide-in list THEN system SHALL close the list and show the practice.
- [x] AC-020: WHEN the page is shown at a 360px wide viewport THEN system SHALL have no horizontal page scrolling.

### P3: Quick filter in the sidebar

- As a learner, I want to type into a filter above the sidebar list so that I can jump to a practice by name.
- **Why P3:** 14 items fit on one screen, so filtering is a convenience.

**Acceptance Criteria:**

- [x] AC-021: WHEN the user types in the sidebar filter THEN system SHALL show only the practices whose name contains the text, ignoring case.
- [x] AC-022: WHEN no practice matches the filter THEN system SHALL show a "no matches" message and a way to clear the filter.

### P3: Choose a theme (added 2026-10-06, quick task 001-theme-toggle)

- As a learner, I want to pick light, dark, or the system theme so that the playground is comfortable in any lighting.
- **Why P3:** Comfort; the app already follows the system theme by default.

**Acceptance Criteria:**

- [x] AC-023: WHEN the playground is first opened THEN system SHALL follow the operating system's theme and update live when it changes.
- [x] AC-024: WHEN the user activates the theme control in the top bar THEN system SHALL cycle Light → Dark → System, and the control SHALL state the current and next theme to assistive technology.
- [x] AC-025: WHEN a theme was chosen THEN system SHALL keep it across navigation and reloads, applying it before the page first paints (no flash of the other theme).
- [x] AC-026: WHEN the browser blocks storage THEN the control SHALL still switch the theme for the current page.

## Edge Cases

- WHEN a practice's name is longer than the sidebar width THEN system SHALL truncate it with an ellipsis and show the full name on hover and to assistive technology.
- WHEN the user leaves a practice while its demo has pending activity (requests, timers, streams) THEN system SHALL stop that activity so it doesn't affect the next practice.
- WHEN the user resizes from narrow to wide while the slide-in list is open THEN system SHALL close the slide-in and show the persistent sidebar.
- WHEN the user prefers reduced motion THEN system SHALL open and close the slide-in list without animation.
- WHEN the browser has no JavaScript yet (first paint) THEN system SHALL still show the sidebar links and the practice title, so navigation works through plain links.

## Success Criteria

- [x] Switching between any two practices on a warm load takes under 300 ms to show the new title, on a typical laptop in dev-free (production) mode.
- [x] All 22 acceptance criteria pass by manual check; keyboard-only navigation reaches every practice.
- [x] No accessibility violations of serious or critical level on the overview and a placeholder practice page in an automated audit.
- [x] A follow-up practice feature (002+) can be added without editing the sidebar, overview, or layout code.

## Open Questions

- None. Decisions are recorded in [decisions.md](decisions.md).

## Notes

- This is a personal learning project. The user is the only stakeholder and the primary audience.
- Cross-practice rules (what "no third-party library" means, where demo data comes from, what extras each practice page carries) are in [decisions.md](decisions.md). Each follow-up practice spec inherits them.
- Follow-up features use IDs 002–015 in catalog order by default; the build order can differ and is chosen when each practice is picked up.
