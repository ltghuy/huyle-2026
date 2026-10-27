import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import HomePage from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

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
