import {
  BookOpenText,
  Dumbbell,
  House,
  Library,
  type LucideIcon,
  NotebookPen,
  Shuffle,
  RotateCcw,
  Settings,
  Swords,
  TriangleAlert,
  Users,
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
  { href: "/arena", label: "Đấu trường", icon: Swords, tour: "arena" },
  { href: "/hard-words", label: "Từ khó", icon: TriangleAlert, tour: "hard-words" },
  { href: "/settings", label: "Cài đặt", icon: Settings, tour: "settings" },
] as const satisfies readonly NavItem[];

/**
 * Desktop sidebar: these pages sit under one collapsible "Thư viện" row (quick 048).
 * The mobile bar and its "Thêm" sheet still list them one by one.
 */
export const LIBRARY_GROUP = {
  label: "Thư viện",
  icon: Library,
  hrefs: ["/vocabulary", "/grammar", "/irregular-verbs"],
} as const satisfies { label: string; icon: LucideIcon; hrefs: readonly string[] };

/**
 * Mobile bottom bar, in this order: at most five slots counting "Thêm", which holds the rest.
 * `MOBILE_CENTER` is the raised button in the middle (quick 049).
 */
export const MOBILE_PRIMARY = ["/", "/vocabulary", "/arena", "/review"] as const;
export const MOBILE_CENTER = "/arena";

/**
 * Phones only, at the end of the "Thêm" sheet: the desktop sidebar shows friends as its own
 * section under the navigation instead (feature 032).
 */
export const MOBILE_MORE_EXTRA = [{ href: "/friends", label: "Bạn bè", icon: Users, tour: "friends" }] as const satisfies readonly NavItem[];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
