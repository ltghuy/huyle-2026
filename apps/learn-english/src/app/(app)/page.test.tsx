import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import HomePage from "./page";

describe("HomePage", () => {
  it("shows today's lesson heading in Vietnamese", () => {
    render(
      <SidebarProvider>
        <HomePage />
      </SidebarProvider>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Bài học hôm nay" })).toBeInTheDocument();
  });
});
