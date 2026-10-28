import {
  BookOpenText,
  Dumbbell,
  House,
  type LucideIcon,
  NotebookPen,
  Shuffle,
  RotateCcw,
  Settings,
  TriangleAlert,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Target for the first-visit tour (`data-tour`). */
  tour: string;
}

// "Hồ sơ" isn't listed: it sits in the top-right corner of the page header (`AccountLink`).
export const NAV_ITEMS = [
  { href: "/", label: "Hôm nay", icon: House, tour: "lesson" },
  { href: "/vocabulary", label: "Từ vựng", icon: BookOpenText, tour: "vocabulary" },
  { href: "/grammar", label: "Ngữ pháp", icon: NotebookPen, tour: "grammar" },
  { href: "/irregular-verbs", label: "Động từ bất quy tắc", icon: Shuffle, tour: "irregular-verbs" },
  { href: "/review", label: "Ôn tập", icon: RotateCcw, tour: "review" },
  { href: "/exercises", label: "Bài tập", icon: Dumbbell, tour: "exercises" },
  { href: "/hard-words", label: "Từ khó", icon: TriangleAlert, tour: "hard-words" },
  { href: "/settings", label: "Cài đặt", icon: Settings, tour: "settings" },
] as const satisfies readonly NavItem[];

/** Mobile bottom bar: at most five slots; the rest live behind "Thêm". */
export const MOBILE_PRIMARY = ["/", "/review", "/vocabulary", "/exercises"] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
