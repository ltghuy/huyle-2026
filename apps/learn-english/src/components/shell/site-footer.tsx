import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const LINKS = [
  { href: "/privacy", label: "Quyền riêng tư" },
  { href: "/terms", label: "Điều khoản" },
] as const;

/** The footer of every page with navigation: copyright, the legal note and the privacy and terms links (029 AC-006). */
export function SiteFooter() {
  // On phones the bottom padding keeps the links clear of the raised Arena button and the back-to-top button.
  return (
    <footer className="mt-auto px-4 pt-8 pb-16 md:px-8 md:pb-0">
      <div className="flex flex-col gap-4 border-t pt-6 text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="grid gap-1">
          <p className="text-xs font-semibold tracking-widest uppercase">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p className="text-xs">Bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP &amp; Quản lý dịch vụ mạng theo Nghị định 147/2024/NĐ-CP.</p>
        </div>
        <nav aria-label="Pháp lý" className="flex shrink-0 gap-6">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-xs font-semibold tracking-widest whitespace-nowrap uppercase underline-offset-4 hover:text-foreground hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
