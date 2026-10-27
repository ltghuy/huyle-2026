import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("HomePage", () => {
  it("shows the Vietnamese app title", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Học tiếng Anh" })).toBeInTheDocument();
  });
});
