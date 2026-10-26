---
id: "017"
feature: accessibility-handbook
created: 2026-10-08
---

# Decisions: Accessibility Handbook

The user asked for the next page, Accessibility, based on web.dev *Learn
Accessibility*, with the 13 content-design modules from their screenshot, in
the same style as the Performance page (main concepts, short, demonstrated).
Gray areas were settled with defaults, without asking.

## Resolved

### How to group 13 modules

- **Question:** one topic per module, or grouped like the Performance page?
- **Decision:** ten topics: (1) Semantic HTML and ARIA; (2) Structure and the document; (3) Keyboard focus; (4) JavaScript and dynamic content; (5) Images, video and audio; (6) Color and contrast; (7) Typography; (8) Animation and motion; (9) Forms; (10) Patterns, design systems and design.
- **Rationale:** content structure and the document are both about page-level HTML; images and media are both about alternatives; patterns and design/UX are both about how teams work. Each of the ten has a demo the browser can show.
- **Caveats:** prose budget raised to ~2,000 words for ten topics.

### What "what a screen reader sees" means

- **Question:** demos can't run a real screen reader; how to show what it gets?
- **Decision:** read the demo's real elements at that moment (role, accessible name, states, description) with a small simplified reader, and label it "simplified".
- **Rationale:** the numbers come from the page, not from hard-coded text, so changing the markup changes the result; the label keeps it honest that real screen readers differ.
- **Caveats:** the naming rules are a subset of the accessible-name algorithm (enough for the demos' markup).

### Testing modules

- **Question:** the course also has three testing modules, not in the user's list.
- **Decision:** one point and links in the last topic, no demo.
- **Rationale:** the user listed the content-design modules only; testing is still worth a pointer.

### Broken versions on purpose

- **Question:** demos that show the wrong way (div button, low contrast preset, placeholder-only form) may fail audits.
- **Decision:** keep them, mark each as "the wrong way, on purpose" in words, and have the audit count only issues outside those.
- **Rationale:** comparing wrong and right is the point of each demo.

### Links to practices

- **Question:** keep the placeholder's pointer to practice 8?
- **Decision:** the keyboard focus and JavaScript topics link practice 8 (dialogs), and the forms topic links practice 10 (multi-step form), and the JavaScript topic links practice 2 (searchable accordion).
- **Rationale:** the practices show the full patterns; the handbook stays short.
