"use client";

import { useState } from "react";
import { CircleHelp, Swords, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QUESTION_TIMES } from "@/learning/arena/protocol";
import { MAX_SUDDEN_DEATH, ROUND_SIZE } from "@/learning/arena/questions";

export const GUIDE_TOOLTIP = "Cách chơi và cách giành chiến thắng?";

interface GuideSection {
  title: string;
  icon: LucideIcon;
  points: readonly string[];
}

// The rules of feature 023, in the learner's words (024 AC-009).
const SECTIONS: readonly GuideSection[] = [
  {
    title: "Vào trận",
    icon: Users,
    points: [
      "Chọn chế độ, trình độ, số hiệp và thời gian mỗi câu, bấm “Tạo phòng” rồi gửi mã 6 ký tự cho bạn bè.",
      "Khi bạn bè vào phòng, cả hai bấm “Sẵn sàng” trong 30 giây để bắt đầu.",
    ],
  },
  {
    title: "Cách chơi",
    icon: Swords,
    points: [
      `Mỗi hiệp có ${ROUND_SIZE} câu hỏi, giống nhau và cùng thứ tự cho cả hai người.`,
      `Chủ phòng chọn thời gian cho mỗi câu: ${QUESTION_TIMES.join(", ")} giây.`,
      "Nghe: nghe rồi chọn từ đúng. Chọn sai là mất lượt ở câu đó.",
      "Nhớ từ: xem nghĩa tiếng Việt rồi gõ từ tiếng Anh. Gõ sai thì gõ lại được.",
      "Viết câu: dịch câu tiếng Việt sang tiếng Anh. Gõ sai thì gõ lại được.",
      "Hỗn hợp: cả ba dạng xen kẽ nhau.",
    ],
  },
  {
    title: "Cách thắng",
    icon: Trophy,
    points: [
      "Ai trả lời đúng trước được 1 điểm, và câu hỏi kết thúc cho cả hai. Hết giờ mà không ai đúng thì không ai có điểm.",
      `Hết ${ROUND_SIZE} câu, ai nhiều điểm hơn thắng hiệp.`,
      `Hòa điểm thì có câu hỏi quyết định: ai đúng trước thắng hiệp (tối đa ${MAX_SUDDEN_DEATH} câu). Nếu vẫn hòa, ai trả lời đúng nhanh hơn trong cả hiệp sẽ thắng.`,
      "Chọn 1 hiệp: thắng hiệp là thắng trận. Chọn 3 hiệp: ai thắng 2 hiệp trước là thắng trận.",
    ],
  },
];

const NOTES = [
  "Rời trận quá 30 giây thì đối thủ thắng.",
  "Kết quả chỉ tính vào thành tích Đấu trường, không đổi điểm, chuỗi ngày hay Ôn tập.",
] as const;

/** Help button for the 1-1 card: a tooltip on hover or focus, the full guide on press (024 AC-009). */
export function GameGuide() {
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
            <DialogTitle>Hướng dẫn chơi</DialogTitle>
            <DialogDescription>Đọc nhanh cách chơi và cách giành chiến thắng trước khi vào trận nhé.</DialogDescription>
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
