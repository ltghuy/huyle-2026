import { afterEach, describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/components/shell/nav";
import { CARD_ROOM_Y, scrollDelta, sideFor, stepDescription, stepTitle, TOUR_STEPS, tourSteps } from "./tour-steps";

function targetAt(rect: { top: number; left: number; width: number; height: number }): HTMLElement {
  const element = document.createElement("div");
  const box = { ...rect, x: rect.left, y: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height };
  element.getBoundingClientRect = () => ({ ...box, toJSON: () => box });
  return element;
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

describe("sideFor", () => {
  afterEach(() => setViewport(1024, 768));

  it("puts the card beside a sidebar item on desktop", () => {
    setViewport(1280, 800);
    expect(sideFor(targetAt({ top: 200, left: 8, width: 240, height: 48 }))).toBe("right");
  });

  it("puts the card below a wide target with no room beside it (the lesson card)", () => {
    setViewport(1280, 800);
    expect(sideFor(targetAt({ top: 130, left: 270, width: 990, height: 400 }))).toBe("bottom");
  });

  it("puts the card above targets low on the screen (the mobile bottom bar)", () => {
    setViewport(390, 844);
    expect(sideFor(targetAt({ top: 790, left: 0, width: 78, height: 56 }))).toBe("top");
  });

  it("puts the card above a target too tall to leave room below it (the signed-in lesson card on a short screen)", () => {
    setViewport(1288, 623);
    expect(sideFor(targetAt({ top: 160, left: 270, width: 990, height: 420 }))).toBe("top");
  });

  it("puts the card below targets on phones", () => {
    setViewport(390, 844);
    expect(sideFor(targetAt({ top: 120, left: 16, width: 120, height: 40 }))).toBe("bottom");
  });
});

describe("scrollDelta", () => {
  afterEach(() => setViewport(1024, 768));

  it("leaves a target alone when it and its card already fit", () => {
    setViewport(1280, 800);
    expect(scrollDelta(targetAt({ top: 130, left: 270, width: 990, height: 300 }), "bottom")).toBe(0);
    expect(scrollDelta(targetAt({ top: 200, left: 8, width: 240, height: 48 }), "right")).toBe(0);
    expect(scrollDelta(targetAt({ top: 740, left: 0, width: 78, height: 44 }), "top")).toBe(0);
  });

  it("scrolls a lesson card cut off at the bottom up, keeping room for the card above it", () => {
    setViewport(1288, 623);
    // Card above: the target's top lands at the card's room, as it is taller than what is left.
    expect(scrollDelta(targetAt({ top: 475, left: 270, width: 990, height: 420 }), "top")).toBe(475 - CARD_ROOM_Y);
  });

  it("shows all of a tall lesson card when the measured step card leaves room for it", () => {
    setViewport(1288, 623);
    // A 132 px card plus its gap: scrolling 284 px puts the lesson card at 191 to 611, all on screen.
    expect(scrollDelta(targetAt({ top: 475, left: 270, width: 990, height: 420 }), "top", 160)).toBe(895 - (623 - 12));
  });

  it("scrolls only as far as needed when the whole target fits", () => {
    setViewport(1280, 800);
    // Card below: just enough for the target and its card to show.
    expect(scrollDelta(targetAt({ top: 400, left: 270, width: 990, height: 200 }), "bottom")).toBe(400 + 200 + CARD_ROOM_Y - 800);
    expect(scrollDelta(targetAt({ top: 700, left: 270, width: 990, height: 60 }), "top")).toBe(0);
    expect(scrollDelta(targetAt({ top: 760, left: 270, width: 990, height: 60 }), "top")).toBe(760 + 60 - (800 - 12));
  });

  it("scrolls back up to a target above the screen", () => {
    setViewport(1280, 800);
    expect(scrollDelta(targetAt({ top: -300, left: 270, width: 990, height: 200 }), "bottom")).toBe(-312);
  });
});

describe("TOUR_STEPS (001 AC-039)", () => {
  it("visits every menu item (Hôm nay through the lesson card) and the streak and points summary", () => {
    const targets = TOUR_STEPS.map((step) => step.target);
    for (const item of NAV_ITEMS) expect(targets).toContain(item.tour === "lesson" ? "lesson-card" : item.tour);
    expect(targets).toContain("streak");
    expect(new Set(targets).size).toBe(targets.length);
  });
});

describe("the tour for guests and signed-in learners (022 AC-030)", () => {
  const targets = (guest: boolean) => tourSteps(guest).map((step) => step.target);

  it("starts a guest at signing in, without the streak step that sits inside the locked lesson", () => {
    expect(targets(true)).toEqual(["account", "lesson-card", "vocabulary", "grammar", "irregular-verbs", "review", "exercises", "arena", "hard-words", "profile", "settings"]);
  });

  it("shows a signed-in learner their account after the profile", () => {
    expect(targets(false)).toEqual(["lesson-card", "streak", "vocabulary", "grammar", "irregular-verbs", "review", "exercises", "arena", "hard-words", "profile", "account", "settings"]);
  });

  it("marks locked areas in the title for guests only, and gives guests their own account and lesson text", () => {
    const step = (target: string) => TOUR_STEPS.find((def) => def.target === target)!;
    expect(stepTitle(step("review"), true)).toBe("Ôn tập (cần đăng nhập)");
    expect(stepTitle(step("review"), false)).toBe("Ôn tập");
    expect(stepTitle(step("vocabulary"), true)).toBe("Từ vựng");
    expect(stepDescription(step("account"), true)).toMatch(/^Đăng nhập bằng Google/);
    expect(stepDescription(step("account"), false)).toMatch(/^Tài khoản Google của bạn/);
    expect(stepDescription(step("lesson-card"), true)).toMatch(/^Sau khi đăng nhập/);
    expect(stepDescription(step("review"), true)).toBe(step("review").description);
  });
});
