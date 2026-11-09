import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { MobileNav } from "./mobile-nav";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

beforeEach(() => {
  pathname = "/";
});

describe("MobileNav Thêm sheet (feature 032)", () => {
  it("lists Bạn bè, linking to the friends page (AC-001)", async () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByRole("button", { name: "Thêm" }));
    const sheet = await screen.findByRole("dialog", { name: "Thêm" });
    expect(within(sheet).getByRole("link", { name: "Bạn bè" })).toHaveAttribute("href", "/friends");
  });

  it("marks Thêm and Bạn bè as current on the friends page (AC-004)", async () => {
    pathname = "/friends";
    render(<MobileNav />);
    const more = screen.getByRole("button", { name: "Thêm" });
    expect(more).toHaveClass("text-primary");
    fireEvent.click(more);
    const sheet = await screen.findByRole("dialog", { name: "Thêm" });
    expect(within(sheet).getByRole("link", { name: "Bạn bè" })).toHaveAttribute("aria-current", "page");
  });
});
