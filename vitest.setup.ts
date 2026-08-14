import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// happy-dom may not implement matchMedia; provide a default (non-reduced-motion)
// mock. Individual tests override window.matchMedia to exercise reduced motion.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});
