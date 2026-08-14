import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWebGLAvailable } from "./useWebGLAvailable";

describe("useWebGLAvailable", () => {
  it("returns false when a WebGL context cannot be created", () => {
    // happy-dom does not implement a WebGL context, so detection resolves false
    const { result } = renderHook(() => useWebGLAvailable());
    expect(result.current).toBe(false);
  });
});
