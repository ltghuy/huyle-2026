import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test-utils/render";
import PrivacyPage from "./page";

describe("PrivacyPage", () => {
  it("has the ten numbered sections, citing Nghị định 13/2023/NĐ-CP (029 AC-001, AC-003)", () => {
    render(<PrivacyPage />);
    const titles = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(titles).toEqual([
      "1. Giới thiệu và phạm vi",
      "2. Dữ liệu ứng dụng thu thập",
      "3. Mục đích xử lý",
      "4. Người khác thấy gì",
      "5. Bên thứ ba",
      "6. Thời gian lưu trữ",
      "7. Quyền của bạn",
      "8. Rút lại đồng ý và xóa dữ liệu",
      "9. Bảo vệ dữ liệu",
      "10. Liên hệ",
    ]);
    expect(screen.getByText(/Cập nhật lần cuối: \d{2}\/\d{2}\/\d{4}/)).toBeInTheDocument();
    expect(screen.getAllByText(/Nghị định 13\/2023\/NĐ-CP/).length).toBeGreaterThan(1);
    expect(screen.getByRole("link", { name: "Cài đặt" })).toHaveAttribute("href", "/settings#tai-khoan");
    expect(screen.getByRole("link", { name: "Điều khoản sử dụng" })).toHaveAttribute("href", "/terms");
  });
});
