import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

/** The owner's MoMo / VietQR code: a sharp crop of the card for the footer, and the full image to open or save (quick 057). */
const QR_CARD = "/donate/momo-qr-card.webp";
const QR_FULL = "/donate/momo-qr.jpg";

const LINKS = [
  { href: "/privacy", label: "Quyền riêng tư" },
  { href: "/terms", label: "Điều khoản" },
] as const;

/**
 * The footer of every page with navigation (029 AC-006, quick 057, quick 058): the app's name and what it is
 * next to the donation QR, then the copyright, the legal note and the privacy and terms links.
 */
export function SiteFooter() {
  // On phones the bottom padding keeps the links clear of the raised Arena button and the back-to-top button.
  return (
    <footer className="mt-auto px-4 pt-8 pb-16 md:px-8 md:pb-0">
      <div className="border-t pt-8 text-muted-foreground">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
          <div className="grid max-w-md gap-2">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <GraduationCap className="size-5 text-primary" aria-hidden />
              {SITE_NAME}
            </p>
            <p className="text-sm">Học tiếng Anh mỗi ngày cho người Việt: từ vựng, ngữ pháp và lịch ôn tập nhắc bạn đúng lúc sắp quên. Miễn phí và không có quảng cáo.</p>
          </div>

          <section aria-label="Ủng hộ" className="flex w-full items-center gap-4 rounded-xl border bg-card p-4 md:max-w-md">
            <a href={QR_FULL} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              {/* A static file shown as is: next/image has nothing to optimise, and resampling could blur the code. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={QR_CARD}
                alt={`Mã QR MoMo và VietQR để ủng hộ ${SITE_NAME}, chủ tài khoản LE TRAN GIA HUY`}
                width={400}
                height={420}
                loading="lazy"
                className="h-auto w-28 rounded-lg bg-white ring-1 ring-border"
              />
            </a>
            <div className="grid gap-1.5">
              <p className="text-sm font-semibold text-foreground">Ủng hộ {SITE_NAME}</p>
              <p className="text-xs">Nếu thấy hữu ích, bạn có thể ủng hộ một ly cà phê để duy trì máy chủ: quét mã bằng MoMo hoặc ứng dụng ngân hàng.</p>
              <a href={QR_FULL} target="_blank" rel="noreferrer" className="text-xs text-link underline underline-offset-4">
                Mở mã QR để lưu ảnh
              </a>
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t pt-6 pb-2 md:flex-row md:items-center md:justify-between">
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
      </div>
    </footer>
  );
}
