import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";

import "./globals.css";

// The vietnamese subset carries the stacked diacritics (ắ, ề, ữ…) the UI copy needs.
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Học tiếng Anh",
    template: "%s · Học tiếng Anh",
  },
  description:
    "Học từ vựng, ngữ pháp và luyện tập tiếng Anh mỗi ngày, với lịch ôn tập giúp bạn nhớ lâu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
