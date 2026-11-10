import { describe, expect, it } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GUIDE_TOOLTIP } from "./game-guide";
import { TeamGameGuide } from "./team-game-guide";

function renderGuide() {
  return render(
    <TooltipProvider>
      <TeamGameGuide />
    </TooltipProvider>,
  );
}

describe("TeamGameGuide (AC-048)", () => {
  it("shows the tooltip on hover", async () => {
    renderGuide();
    const button = screen.getByRole("button", { name: "Hướng dẫn chơi" });
    await act(async () => fireEvent.mouseEnter(button));
    await act(async () => fireEvent.pointerEnter(button, { pointerType: "mouse" }));
    expect(await screen.findByText(GUIDE_TOOLTIP)).toBeInTheDocument();
  });

  it("covers teams, turns, the round clock, hints, scoring, rounds and disconnects", async () => {
    renderGuide();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Hướng dẫn chơi" })));
    const dialog = await screen.findByRole("dialog", { name: "Hướng dẫn Đấu đội" });
    for (const heading of ["Chia đội", "Lượt chơi", "Đồng hồ hiệp", "Gợi ý", "Cách thắng", "Khi mất kết nối"]) {
      expect(within(dialog).getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(within(dialog).getByText(/chủ phòng xếp từng người vào Đội A hoặc Đội B/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Đội A, Đội B, Đội A/)).toBeInTheDocument();
    expect(within(dialog).getByText(/5, 10, 15 phút/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Đồng hồ về 0 là hiệp kết thúc ngay/)).toBeInTheDocument();
    expect(within(dialog).getByText(/“happy” thành “h\*\*\*\*”/)).toBeInTheDocument();
    expect(within(dialog).getByText(/nhờ gợi ý vẫn được 1 điểm/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Sau 3 cặp câu vẫn hòa/)).toBeInTheDocument();
    expect(within(dialog).getByText(/đội nào thắng 2 hiệp trước/)).toBeInTheDocument();
    expect(within(dialog).getByText(/cả đội mất kết nối quá 30 giây/)).toBeInTheDocument();
  });
});
