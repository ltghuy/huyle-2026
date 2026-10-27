/** Areas the first-visit tour walks through (AC-039), in order. */
export interface TourStepDef {
  /** `data-tour` value of the element to point at. */
  target: string;
  title: string;
  description: string;
}

export const TOUR_STEPS: TourStepDef[] = [
  { target: "lesson-card", title: "Bài học hôm nay", description: "Mỗi ngày có một bài: ôn lại từ cũ, học từ mới, ngữ pháp, đặt câu và một bài viết ngắn. Học xong bạn được cộng điểm chuyên cần." },
  { target: "vocabulary", title: "Từ vựng", description: "Tra từ theo trình độ và chủ đề, nghe phát âm và đánh dấu những từ bạn đã biết." },
  { target: "grammar", title: "Ngữ pháp", description: "Các điểm ngữ pháp và 12 thì, giải thích bằng tiếng Việt kèm ví dụ và bài luyện." },
  { target: "review", title: "Ôn tập", description: "Ứng dụng nhắc bạn ôn lại đúng lúc bạn sắp quên, để nhớ từ lâu hơn." },
  { target: "exercises", title: "Bài tập", description: "Tự luyện bất kỳ phần nào: trắc nghiệm, điền chữ, nghe, sắp xếp câu." },
  { target: "hard-words", title: "Từ khó", description: "Những từ bạn hay sai hoặc nhớ lâu được gom lại đây để luyện riêng." },
  { target: "profile", title: "Hồ sơ", description: "Xem điểm chuyên cần, chuỗi ngày học và lịch các ngày bạn đã học." },
  { target: "settings", title: "Cài đặt", description: "Đổi trình độ, sao lưu tiến độ hoặc xem lại hướng dẫn này." },
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

/** Where the step card goes so it stays on screen: above bottom-bar items, below on phones, beside on desktop. */
export function sideFor(target: HTMLElement | null): TourSide {
  if (!target) return "bottom";
  const rect = target.getBoundingClientRect();
  if (rect.top > window.innerHeight * 0.6) return "top";
  return window.innerWidth < 768 ? "bottom" : "right";
}
