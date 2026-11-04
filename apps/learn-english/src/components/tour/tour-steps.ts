/** Areas the first-visit tour walks through (AC-039), in order. */
export interface TourStepDef {
  /** `data-tour` value of the element to point at. */
  target: string;
  title: string;
  description: string;
  /** Needs sign-in (feature 022): for guests the step says so (AC-030). */
  locked?: boolean;
  /** What a guest reads instead, when the step means something else to them. */
  guestDescription?: string;
}

/** A step's text for this learner: locked areas tell guests they need a Google sign-in (AC-030). */
export function stepDescription(step: TourStepDef, guest: boolean): string {
  return step.guestDescription && guest ? step.guestDescription : step.description;
}

/** A step's title; for guests, locked areas say so in it, so the description isn't repeated on every step (AC-030). */
export function stepTitle(step: TourStepDef, guest: boolean): string {
  return guest && step.locked ? `${step.title} (cần đăng nhập)` : step.title;
}

export const TOUR_STEPS: TourStepDef[] = [
  { target: "lesson-card", locked: true, guestDescription: "Sau khi đăng nhập, mỗi ngày bạn có một bài ở đây: ôn lại từ cũ, học từ mới, ngữ pháp, đặt câu và một bài viết ngắn. Học xong được 20 điểm và thêm một ngày vào chuỗi.", title: "Bài học hôm nay", description: "Mỗi ngày có một bài: ôn lại từ cũ, học từ mới, ngữ pháp, đặt câu và một bài viết ngắn. Học xong bạn được 20 điểm và thêm một ngày vào chuỗi." },
  {
    target: "streak",
    locked: true,
    title: "Chuỗi ngày và điểm",
    description: "Học mỗi ngày để giữ chuỗi: bảng xếp hạng xếp theo số ngày học liên tiếp. Học xong bài hôm nay, bạn có thể dùng điểm để học thêm một bài, bài đầu 10 điểm, mỗi bài sau trong ngày đắt hơn 30%.",
  },
  { target: "vocabulary", title: "Từ vựng", description: "Tra từ theo trình độ và chủ đề, nghe phát âm, đánh dấu từ đã biết, hoặc học theo bộ từ Chuyên ngành." },
  { target: "grammar", locked: true, title: "Ngữ pháp", description: "Các điểm ngữ pháp và 12 thì, giải thích bằng tiếng Việt kèm ví dụ và bài luyện." },
  { target: "irregular-verbs", locked: true, title: "Động từ bất quy tắc", description: "Tra dạng quá khứ và quá khứ phân từ của động từ bất quy tắc, nghe phát âm và luyện riêng từng động từ." },
  { target: "review", locked: true, title: "Ôn tập", description: "Ứng dụng nhắc bạn ôn lại đúng lúc bạn sắp quên, để nhớ từ lâu hơn." },
  { target: "exercises", locked: true, title: "Bài tập", description: "Tự luyện bất kỳ phần nào: trắc nghiệm, điền chữ, nghe chép, sắp xếp câu, tìm lỗi sai." },
  { target: "arena", locked: true, title: "Đấu trường", description: "Thách đấu bạn bè bằng mã phòng: cùng một câu hỏi, ai trả lời đúng trước thì ghi điểm. Số trận thắng thua được lưu vào hồ sơ." },
  { target: "hard-words", locked: true, title: "Từ khó", description: "Những từ bạn hay sai hoặc nhớ lâu được gom lại đây để luyện riêng." },
  { target: "profile", locked: true, title: "Hồ sơ", description: "Xem điểm hiện có, tổng điểm đã nhận, chuỗi ngày học và lịch các ngày bạn đã học." },
  {
    target: "account",
    title: "Tài khoản",
    description: "Tài khoản Google của bạn. Tiến độ được lưu vào đây và giống nhau trên mọi thiết bị bạn đăng nhập. Bấm vào ảnh để xem hồ sơ.",
    guestDescription: "Đăng nhập bằng Google để mở bài học hôm nay, ôn tập, ngữ pháp, bài tập và hồ sơ, và giữ tiến độ trên mọi thiết bị. Miễn phí.",
  },
  { target: "settings", title: "Cài đặt", description: "Đăng nhập hoặc quản lý tài khoản, đổi trình độ, sao lưu tiến độ, tham gia bảng xếp hạng hoặc xem lại hướng dẫn này." },
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
/** Room a step card takes above or below a target before it is measured: its tallest text plus offset and padding. */
export const CARD_ROOM_Y = 260;
/** What a measured step card adds to its own height: the side offset and collision padding. */
export const CARD_GAP = 16 + 12;
/** Space kept between a scrolled-to target and the edge of the screen. */
const EDGE = 12;

/**
 * Where the step card goes so it stays on screen: above bottom-bar items and targets too tall to
 * leave room below once scrolled to, beside sidebar items on desktop, else below.
 */
export function sideFor(target: HTMLElement | null): TourSide {
  if (!target) return "bottom";
  const rect = target.getBoundingClientRect();
  if (rect.top > window.innerHeight * 0.6) return "top";
  if (window.innerWidth >= 768 && window.innerWidth - rect.right >= CARD_ROOM) return "right";
  if (rect.height + CARD_ROOM_Y + EDGE > window.innerHeight) return "top";
  return "bottom";
}

/**
 * How far to scroll the page so the target shows on screen with `room` for the card on `side`
 * (0 when it already does). A target taller than the room left keeps its top in view.
 */
export function scrollDelta(target: HTMLElement, side: TourSide, room = CARD_ROOM_Y): number {
  const { top, bottom } = target.getBoundingClientRect();
  const height = window.innerHeight;
  if (side === "top") {
    if (top >= room && bottom <= height - EDGE) return 0;
    return Math.min(top - room, bottom - (height - EDGE));
  }
  if (side === "bottom") {
    if (top >= EDGE && bottom + room <= height) return 0;
    if (top < EDGE) return top - EDGE;
    return Math.min(bottom + room - height, top - EDGE);
  }
  if (top >= EDGE && bottom <= height - EDGE) return 0;
  return top < EDGE ? top - EDGE : bottom - (height - EDGE);
}

/**
 * The tour for this learner (feature 022). A guest starts at signing in, with no streak step (it is
 * part of the locked lesson card); a signed-in learner meets their account after the profile.
 */
export function tourSteps(guest: boolean): TourStepDef[] {
  if (!guest) return TOUR_STEPS;
  const account = TOUR_STEPS.find((step) => step.target === "account")!;
  return [account, ...TOUR_STEPS.filter((step) => step !== account && step.target !== "streak")];
}
