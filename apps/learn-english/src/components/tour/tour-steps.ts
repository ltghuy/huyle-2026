/** Areas the first-visit tour walks through (AC-039), in order. */
export interface TourStepDef {
  /** `data-tour` value of the element to point at. */
  target: string;
  title: string;
  description: string;
}

export const TOUR_STEPS: TourStepDef[] = [
  { target: "lesson-card", title: "Bài học hôm nay", description: "Mỗi ngày có một bài: ôn lại từ cũ, học từ mới, ngữ pháp, đặt câu và một bài viết ngắn. Học xong bạn được 20 điểm và thêm một ngày vào chuỗi." },
  {
    target: "streak",
    title: "Chuỗi ngày và điểm",
    description: "Học mỗi ngày để giữ chuỗi: bảng xếp hạng xếp theo số ngày học liên tiếp. Học xong bài hôm nay, bạn có thể dùng điểm để học thêm một bài, bài đầu 10 điểm, mỗi bài sau trong ngày đắt hơn 30%.",
  },
  { target: "vocabulary", title: "Từ vựng", description: "Tra từ theo trình độ và chủ đề, nghe phát âm, đánh dấu từ đã biết, hoặc học theo bộ từ Chuyên ngành." },
  { target: "grammar", title: "Ngữ pháp", description: "Các điểm ngữ pháp và 12 thì, giải thích bằng tiếng Việt kèm ví dụ và bài luyện." },
  { target: "irregular-verbs", title: "Động từ bất quy tắc", description: "Tra dạng quá khứ và quá khứ phân từ của động từ bất quy tắc, nghe phát âm và luyện riêng từng động từ." },
  { target: "review", title: "Ôn tập", description: "Ứng dụng nhắc bạn ôn lại đúng lúc bạn sắp quên, để nhớ từ lâu hơn." },
  { target: "exercises", title: "Bài tập", description: "Tự luyện bất kỳ phần nào: trắc nghiệm, điền chữ, nghe chép, sắp xếp câu, tìm lỗi sai." },
  { target: "hard-words", title: "Từ khó", description: "Những từ bạn hay sai hoặc nhớ lâu được gom lại đây để luyện riêng." },
  { target: "profile", title: "Hồ sơ", description: "Xem điểm hiện có, tổng điểm đã nhận, chuỗi ngày học và lịch các ngày bạn đã học." },
  { target: "settings", title: "Cài đặt", description: "Đổi trình độ, sao lưu và đồng bộ tiến độ, tham gia bảng xếp hạng hoặc xem lại hướng dẫn này." },
];

function isVisible(element: Element): boolean {
  return element instanceof HTMLElement && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
}

/**
 * The element a step should point at: the first visible match, else the
 * mobile "Thêm" button (items hidden in that sheet), else null so the step
 * shows centred instead of pointing at nothing.
 */
export function findTarget(target: string, root: ParentNode = document): HTMLElement | null {
  const match = [...root.querySelectorAll(`[data-tour="${target}"]`)].find(isVisible);
  if (match) return match as HTMLElement;
  const more = [...root.querySelectorAll('[data-tour="more"]')].find(isVisible);
  return (more as HTMLElement | undefined) ?? null;
}

export type TourSide = "top" | "bottom" | "right";

/** Room the step card needs beside a target: its `w-80` width plus offset and collision padding. */
const CARD_ROOM = 320 + 32;

/**
 * Where the step card goes so it stays on screen: above bottom-bar items,
 * beside sidebar items on desktop, else below (wide targets such as the lesson card).
 */
export function sideFor(target: HTMLElement | null): TourSide {
  if (!target) return "bottom";
  const rect = target.getBoundingClientRect();
  if (rect.top > window.innerHeight * 0.6) return "top";
  if (window.innerWidth >= 768 && window.innerWidth - rect.right >= CARD_ROOM) return "right";
  return "bottom";
}
