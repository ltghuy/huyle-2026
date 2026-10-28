import { afterEach, describe, expect, it } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { ThemeProvider } from "@/components/theme-provider";
import { AppearanceSetting } from "./appearance-setting";

function setup() {
  render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppearanceSetting />
    </ThemeProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.accent;
  document.documentElement.className = "";
});

describe("AppearanceSetting", () => {
  it("switches between light, dark and the device setting (AC-001, AC-002)", async () => {
    setup();
    const dark = await screen.findByRole("button", { name: "Tối" });
    expect(screen.getByRole("button", { name: "Theo thiết bị" })).toHaveAttribute("aria-pressed", "true");

    await act(async () => fireEvent.click(dark));
    expect(dark).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    // Pressing the selected mode again keeps it selected.
    await act(async () => fireEvent.click(dark));
    expect(dark).toHaveAttribute("aria-pressed", "true");

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Sáng" })));
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("offers five colours and applies the pick at once (AC-003, AC-004)", () => {
    setup();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => radio.closest("label")?.textContent)).toEqual(["Chàm", "Xanh dương", "Xanh ngọc", "Cam", "Hồng"]);
    expect(screen.getByRole("radio", { name: "Chàm" })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "Hồng" }));
    expect(screen.getByRole("radio", { name: "Hồng" })).toBeChecked();
    expect(document.documentElement.dataset.accent).toBe("pink");
    expect(localStorage.getItem("learn-english:accent")).toBe("pink");
  });
});
