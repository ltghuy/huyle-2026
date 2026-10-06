import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "React Practices",
    template: "%s · React Practices",
  },
  description:
    "Fourteen classic React problems, built from scratch with no third-party libraries.",
};

// Runs before first paint: applies the saved theme (or the OS theme for
// "system") so there's no flash, and follows OS changes while on "system".
const THEME_SCRIPT = `(function () {
  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  function preference() {
    var value = root.dataset.theme;
    if (!value) {
      try { value = localStorage.getItem("theme"); } catch (e) {}
    }
    return value === "light" || value === "dark" ? value : "system";
  }
  function apply() {
    var pref = preference();
    root.dataset.theme = pref;
    root.classList.toggle("dark", pref === "dark" || (pref === "system" && media.matches));
  }
  apply();
  media.addEventListener("change", apply);
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme script changes the class and data-theme before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
