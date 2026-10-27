import { afterEach, describe, expect, it } from "vitest";
import { ACCENT_SCRIPT, getAccent, setAccent } from "./appearance";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.accent;
});

describe("main colour", () => {
  it("stores the pick and sets it on <html>; the default removes the attribute", () => {
    setAccent("pink");
    expect(getAccent()).toBe("pink");
    expect(document.documentElement.dataset.accent).toBe("pink");
    setAccent("indigo");
    expect(document.documentElement.dataset.accent).toBeUndefined();
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem("learn-english:accent", "chartreuse");
    expect(getAccent()).toBe("indigo");
  });

  it("applies a stored colour from the pre-paint script, and only a known one (AC-005)", () => {
    localStorage.setItem("learn-english:accent", "orange");
    new Function(ACCENT_SCRIPT)();
    expect(document.documentElement.dataset.accent).toBe("orange");

    delete document.documentElement.dataset.accent;
    localStorage.setItem("learn-english:accent", "x\" onload=");
    new Function(ACCENT_SCRIPT)();
    expect(document.documentElement.dataset.accent).toBeUndefined();
  });
});
