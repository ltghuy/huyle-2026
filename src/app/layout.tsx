import type { Metadata, Viewport } from "next";
import { Fredoka, Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/layout/SkipLink";
import { IntroOverlay } from "@/components/intro/IntroOverlay";
import { IntroVortex } from "@/components/intro/IntroVortex.client";
import { SmoothScroll } from "@/components/layout/SmoothScroll.client";
import { ScrollPortrait } from "@/components/hero/ScrollPortrait.client";
import { OrbField } from "@/components/motion/OrbField.client";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.client";
import { profile } from "@/content/profile";
import { socials } from "@/content/socials";
import "./globals.css";

// Font-swap CLS: next/font already injects `adjustFontFallback` metric overrides
// (kept on), but we also pin `display: "swap"` and metric-matched `fallback`
// stacks so the fallback render sits as close to the loaded face as possible.
// Fredoka is above the fold (hero spine + nav wordmark), so keep it preloaded.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  fallback: ["ui-rounded", "SF Pro Rounded", "system-ui", "sans-serif"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  // Absolute base for canonical / OpenGraph / Twitter URLs (crawlers + social
  // embeds require absolute URLs). Single source of truth: profile.url.
  metadataBase: new URL(profile.url),
  title: "Huy Le — Software Engineer · AI-Native Development",
  description:
    "Le Tran Gia Huy (Huy Le) — Software Engineer building production web platforms in React, Next.js, and TypeScript. AI-native product work, from Vietnam.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Huy Le — Software Engineer · AI-Native Development",
    description:
      "Software Engineer building production web platforms in React, Next.js, and TypeScript. AI-native product work, from Vietnam.",
    url: profile.url,
    siteName: profile.display,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Huy Le — Software Engineer · AI-Native Development",
    description:
      "Software Engineer building production web platforms in React, Next.js, and TypeScript. AI-native product work, from Vietnam.",
  },
  verification: {
    // Google Search Console ownership: set GOOGLE_SITE_VERIFICATION in the deploy
    // env (Search Console → Settings → Ownership verification → HTML tag → the
    // `content` value). Next omits the <meta> entirely when the var is unset.
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  // Favicons are the static app/ files: favicon.ico (raster 16/32/48 — the one
  // Google's favicon crawler fetches), icon.svg (modern browsers), apple-icon.png
  // (iOS). Next auto-wires all three <link rel="icon"> tags.
};

// Mobile browser UI colour (address bar / status bar), keyed to the dark ground.
export const viewport: Viewport = {
  themeColor: "#0b1510",
};

// Schema.org Person structured data — helps search engines build a knowledge
// panel and connect this site to Huy's profiles. Rendered as JSON-LD below.
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  alternateName: profile.display,
  url: profile.url,
  image: `${profile.url}/assets/evan.png`,
  jobTitle: "Software Engineer",
  description: profile.summary,
  email: "letrangiahuy0507@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ho Chi Minh City",
    addressCountry: "VN",
  },
  sameAs: socials
    .map((s) => s.href)
    .filter((href) => href.startsWith("http")),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The inline flag script below adds `fonts-pending`/`fonts-ready` to
      // <html> before React hydrates, so the class attribute legitimately
      // differs from the server render. Scope-suppress the warning on this
      // element (attributes only) — the same pattern theme scripts use.
      suppressHydrationWarning
      className={`${fredoka.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body>
        {/* Font-swap CLS guard: flag <html> as fonts-pending before the hero
            paints, then fonts-ready once the web fonts settle. Decorative corner
            labels (`data-fonts-gate`) stay transparent until then, so their
            fallback→web-font reflow happens while invisible and never books a
            layout shift. Runs during parse (before the hero is parsed); no-JS
            keeps the labels visible. Idempotent, with a timeout backstop. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var h=document.documentElement;h.classList.add('fonts-pending');var d=function(){h.classList.remove('fonts-pending');h.classList.add('fonts-ready');};if(document.fonts&&document.fonts.ready){document.fonts.ready.then(d);}else{d();}setTimeout(d,3000);}catch(e){}})();",
          }}
        />
        {/* Locale guard: reflect the persisted language choice on <html lang>
            before hydration, so the document language is correct immediately
            (the LocaleProvider then keeps it in sync). No-JS keeps lang="en". */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var l=localStorage.getItem('evan-locale');if(l==='vi'||l==='en'){document.documentElement.lang=l;}}catch(e){}})();",
          }}
        />
        {/* Person structured data (JSON-LD) for search engines. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <LocaleProvider>
          {/* First focusable element — lets keyboard users bypass the fixed nav. */}
          <SkipLink />
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
        </LocaleProvider>
      </body>
    </html>
  );
}
