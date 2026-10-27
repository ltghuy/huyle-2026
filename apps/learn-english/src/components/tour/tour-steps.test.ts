import { afterEach, describe, expect, it } from "vitest";
import { sideFor } from "./tour-steps";

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

  it("puts the card below targets on phones", () => {
    setViewport(390, 844);
    expect(sideFor(targetAt({ top: 120, left: 16, width: 120, height: 40 }))).toBe("bottom");
  });
});
