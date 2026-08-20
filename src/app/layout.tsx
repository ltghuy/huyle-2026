import type { Metadata } from "next";
import { Fredoka, Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { IntroOverlay } from "@/components/intro/IntroOverlay";
import { IntroVortex } from "@/components/intro/IntroVortex.client";
import { SmoothScroll } from "@/components/layout/SmoothScroll.client";
import { ScrollPortrait } from "@/components/hero/ScrollPortrait.client";
import { OrbField } from "@/components/motion/OrbField.client";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Huy Le — Software Engineer · AI-Native Development",
  description:
    "Le Tran Gia Huy (Huy Le) — Software Engineer building production web platforms in React, Next.js, and TypeScript. AI-native product work, from Vietnam.",
  openGraph: {
    title: "Huy Le — Software Engineer · AI-Native Development",
    description:
      "Software Engineer building production web platforms in React, Next.js, and TypeScript. AI-native product work, from Vietnam.",
    type: "website",
    locale: "en_US",
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body>
        {/* Fixed / viewport-anchored layers live OUTSIDE #smooth-content — a
            transformed ancestor would otherwise break their position:fixed. */}
        {/* Single page-level ambient orb field — the backmost layer, behind all
            (transparent) sections, so the glow is continuous across the page. */}
        <OrbField />
        <IntroOverlay />
        <IntroVortex />
        <Nav />
        <ScrollPortrait />
        {/* Everything that scrolls goes inside the smoother's content wrapper. */}
        <SmoothScroll>
          {children}
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
