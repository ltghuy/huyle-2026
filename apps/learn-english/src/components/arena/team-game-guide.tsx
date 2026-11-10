"use client";

import { useState } from "react";
import { CircleHelp, Lightbulb, Repeat, Timer, Trophy, Users, WifiOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QUESTION_TIMES } from "@/learning/arena/protocol";
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE, ROUND_MINUTES } from "@/learning/arena/team-protocol";
import { GUIDE_TOOLTIP } from "./game-guide";

interface GuideSection {
  title: string;
  icon: LucideIcon;
  points: readonly string[];
}

// The team rules of feature 039, in the learner's words (AC-048).
const SECTIONS: readonly GuideSection[] = [
  {
    title: "Chia đội",
    icon: Users,
    points: [
      `Chủ phòng chọn số người (từ ${MIN_TEAM_SIZE} đến ${MAX_TEAM_SIZE}, tính cả chủ phòng), tạo phòng rồi gửi mã cho bạn bè.`,
      "Khi mọi người đã vào, chủ phòng xếp từng người vào Đội A hoặc Đội B và sắp thứ tự lượt trong mỗi đội. Hai đội có thể không bằng người.",
      "Mỗi người đều có đội và mỗi đội có ít nhất 1 người thì chủ phòng bấm “Bắt đầu”.",
    ],
  },
  {
    title: "Lượt chơi",
    icon: Repeat,
    points: [
      "Hai đội thay phiên nhau, mỗi đội một câu: Đội A, Đội B, Đội A… Hiệp 2 thì Đội B đi trước.",
      "Trong một đội, các thành viên lần lượt trả lời theo thứ tự chủ phòng đã xếp.",
      "Chỉ người đến lượt mới được trả lời. Mọi người khác cùng xem câu hỏi nhưng không thấy bạn ấy gõ gì.",
      `Mỗi câu có thời gian riêng: ${QUESTION_TIMES.join(", ")} giây, tùy chủ phòng chọn.`,
    ],
  },
  {
    title: "Đồng hồ hiệp",
    icon: Timer,
    points: [
      `Mỗi hiệp kéo dài ${ROUND_MINUTES.join(", ")} phút, tùy chủ phòng chọn. Trả lời càng nhanh thì càng được nhiều câu.`,
      "Đồng hồ về 0 là hiệp kết thúc ngay: câu đang trả lời dừng lại, không tính điểm, và không có câu nào nữa.",
    ],
  },
  {
    title: "Gợi ý",
    icon: Lightbulb,
    points: [
      "Mỗi đội có 1 gợi ý khi bắt đầu mỗi hiệp, và được thêm 1 gợi ý mỗi khi trả lời đúng.",
      "Ai trong đội cũng dùng được gợi ý, nhưng chỉ khi đến lượt mình. Mỗi câu dùng tối đa 1 gợi ý.",
      "Gợi ý chỉ có ở “Nhớ lại từ” và “Viết câu”: nó hiện chữ cái đầu của từ, ví dụ “happy” thành “h****”.",
      "Trả lời đúng nhờ gợi ý vẫn được 1 điểm.",
    ],
  },
  {
    title: "Cách thắng",
    icon: Trophy,
    points: [
      "Mỗi câu trả lời đúng được 1 điểm cho đội. Trả lời sai hay hết giờ thì không đội nào có điểm, và đội kia không được giành câu đó.",
      "Hết hiệp, đội nhiều điểm hơn thắng hiệp.",
      "Hòa điểm thì có câu quyết định: mỗi đội thêm một câu. Một đội đúng, đội kia sai thì đội đúng thắng hiệp. Sau 3 cặp câu vẫn hòa thì hiệp đó “Hòa”.",
      "Chọn 1 hiệp: thắng hiệp là thắng trận. Chọn 3 hiệp: đội nào thắng 2 hiệp trước là thắng trận.",
    ],
  },
  {
    title: "Khi mất kết nối",
    icon: WifiOff,
    points: [
      "Trận vẫn tiếp tục. Lượt của người mất kết nối chuyển cho bạn tiếp theo trong đội, và người đó vào lại thì chơi tiếp đúng chỗ cũ.",
      "Nếu cả đội mất kết nối quá 30 giây, đội kia thắng.",
    ],
  },
];

const NOTES = ["Trận đấu đội được lưu vào Lịch sử đấu, không đổi thành tích Đấu trường, điểm, chuỗi ngày hay Ôn tập."] as const;

/** Help button for the team screen: a tooltip on hover or focus, the full guide on press (AC-048). */
export function TeamGameGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={<Button variant="ghost" size="icon-lg" className="size-11 rounded-full text-muted-foreground hover:text-foreground" aria-label="Hướng dẫn chơi" />}
          onClick={() => setOpen(true)}
        >
          <CircleHelp className="size-5" aria-hidden />
        </TooltipTrigger>
        <TooltipContent side="left">{GUIDE_TOOLTIP}</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Hướng dẫn Đấu đội</DialogTitle>
            <DialogDescription>Đọc nhanh cách chơi theo đội và cách giành chiến thắng trước khi vào trận nhé.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5">
            {SECTIONS.map(({ title, icon: Icon, points }) => (
              <section key={title} className="grid gap-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Icon className="size-4 text-primary" aria-hidden />
                  {title}
                </h3>
                <ul className="grid list-disc gap-1.5 pl-5 text-sm text-muted-foreground marker:text-primary/60">
                  {points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </section>
            ))}
            <ul className="grid gap-1.5 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
              {NOTES.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
