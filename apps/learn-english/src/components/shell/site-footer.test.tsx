import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("shows the legal note and links the privacy policy and the terms (029 AC-006)", () => {
    render(<SiteFooter />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText(/All rights reserved\./)).toBeInTheDocument();
    expect(within(footer).getByText(/Nghị định 13\/2023\/NĐ-CP/)).toBeInTheDocument();
    expect(within(footer).getByRole("link", { name: "Quyền riêng tư" })).toHaveAttribute("href", "/privacy");
    expect(within(footer).getByRole("link", { name: "Điều khoản" })).toHaveAttribute("href", "/terms");
  });
});
