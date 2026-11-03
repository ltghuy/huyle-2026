import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { SidebarProvider } from "@/components/ui/sidebar";
import HomePage from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/" }));

describe("HomePage", () => {
  it("opens with the Streak Daily hero, then today's lesson (019 AC-001, AC-002)", () => {
    render(
      <SidebarProvider>
        <HomePage />
      </SidebarProvider>,
    );
    expect(screen.getAllByRole("heading", { level: 1 }).map((heading) => heading.textContent)).toEqual(["Streak Daily"]);
    expect(screen.getAllByRole("link", { name: /Vào bài hôm nay/ }).map((link) => link.getAttribute("href"))).toEqual(["/lesson", "/lesson"]);
    expect(screen.getByRole("link", { name: "Xem cách học" })).toHaveAttribute("href", "#how");
    expect(screen.getByText("Miễn phí · Đăng nhập bằng Google")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Bài học hôm nay" })).toBeInTheDocument();
  });

  it("explains the method and links the practice areas (019 AC-003, AC-004, AC-005)", () => {
    render(
      <SidebarProvider>
        <HomePage />
      </SidebarProvider>,
    );
    const how = screen.getByRole("region", { name: "Ít mà đều, tiếng Anh sẽ ở lại" });
    expect(within(how).getAllByRole("heading", { level: 3 })).toHaveLength(4);
    expect(within(how).getByText("Ví dụ: Sắp xếp câu")).toBeInTheDocument();
    const areas = screen.getByRole("region", { name: "Muốn luyện thêm? Chọn phần bạn thích" });
    expect(within(areas).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/vocabulary",
      "/grammar",
      "/exercises?tab=sentence",
      "/exercises?type=dictation",
      "/irregular-verbs",
      "/review",
    ]);
    expect(screen.getByRole("region", { name: "Hôm nay bạn đã học chưa?" })).toBeInTheDocument();
  });
});
