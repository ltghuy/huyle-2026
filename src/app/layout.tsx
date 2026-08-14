import type { Metadata } from "next";
import { Fredoka, Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { IntroOverlay } from "@/components/intro/IntroOverlay";
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
        <IntroOverlay />
        <div id="site-content">
          <Nav />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
