import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test-utils/render";
import TermsPage from "./page";

describe("TermsPage", () => {
  it("has the numbered sections, citing Nghị định 147/2024/NĐ-CP (029 AC-004, AC-005)", () => {
    render(<TermsPage />);
    const titles = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(titles).toEqual([
      "1. Chấp nhận điều khoản",
      "2. Dịch vụ",
      "3. Tài khoản",
      "4. Quy tắc ứng xử (Nghị định 147/2024/NĐ-CP)",
      "5. Xử lý vi phạm",
      "6. Nội dung học",
      "7. Sở hữu trí tuệ",
      "8. Ủng hộ",
      "9. Miễn trừ trách nhiệm",
      "10. Thay đổi điều khoản",
      "11. Luật áp dụng và giải quyết khiếu nại",
      "12. Liên hệ",
    ]);
    expect(screen.getByText(/tên gọi của bạn \(trên bảng xếp hạng và ở Đấu trường\)/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quyền riêng tư" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Nguồn dữ liệu" })).toHaveAttribute("href", "/credits");
  });
});
