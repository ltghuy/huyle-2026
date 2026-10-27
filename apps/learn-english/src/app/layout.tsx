import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { InlineScript } from "@/components/inline-script";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ACCENT_SCRIPT } from "@/lib/appearance";
import { AUTHOR, OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL, TWITTER_IMAGE } from "@/lib/site";

import "./globals.css";

// The vietnamese subset carries the stacked diacritics (ắ, ề, ữ…) the UI copy needs.
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

// No canonical here: a layout's canonical is inherited by every page that
// doesn't set its own. Each page sets its own with `pageMetadata`.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [AUTHOR],
  creator: AUTHOR.name,
  keywords: ["học tiếng Anh", "từ vựng tiếng Anh", "ngữ pháp tiếng Anh", "12 thì tiếng Anh", "luyện tiếng Anh mỗi ngày", "English with Evan"],
  openGraph: { type: "website", locale: "vi_VN", siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION, images: [TWITTER_IMAGE] },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the class before first paint, so the server markup differs on purpose.
    <html lang="vi" className={`${beVietnamPro.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Sets the main colour picked in Settings before the first paint (feature 004). */}
        <InlineScript html={ACCENT_SCRIPT} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
