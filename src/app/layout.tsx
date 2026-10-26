import type { Metadata, Viewport } from "next";
import { Fredoka, Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/layout/SkipLink";
import { IntroOverlay } from "@/components/intro/IntroOverlay";
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
  // Front-load the full legal name so the page ranks for "Le Tran Gia Huy"
  // queries (the display name "Huy Le" already ranks). The name is first, so
  // any title truncation only trims the tail, not the name.
  title: "Le Tran Gia Huy (Huy Le) — Software Engineer · AI-Native Development",
  description:
    "Le Tran Gia Huy (Huy Le), also Lê Trần Gia Huy, is a software engineer in Ho Chi Minh City, Vietnam, building production web platforms and AI-native products in React, Next.js, and TypeScript.",
  // Ignored by Google but used by some engines; carries the name variants.
  keywords: [
    "Le Tran Gia Huy",
    "Lê Trần Gia Huy",
    "Huy Le",
    "Gia Huy Le",
    "Software Engineer",
    "Frontend Engineer",
    "React",
    "Next.js",
    "TypeScript",
    "AI-Native Development",
    "Vietnam",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Le Tran Gia Huy (Huy Le) — Software Engineer · AI-Native Development",
    description:
      "Le Tran Gia Huy (Huy Le) is a software engineer in Vietnam, building production web platforms and AI-native products in React, Next.js, and TypeScript.",
    url: profile.url,
    siteName: profile.display,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Le Tran Gia Huy (Huy Le) — Software Engineer · AI-Native Development",
    description:
      "Le Tran Gia Huy (Huy Le) is a software engineer in Vietnam, building production web platforms and AI-native products in React, Next.js, and TypeScript.",
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
  themeColor: "#040c07",
};

// Schema.org Person structured data — helps search engines build a knowledge
// panel and connect this site to Huy's profiles. Rendered as JSON-LD below.
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  // Every name form people search for — the diacritic Vietnamese spelling
  // (used by Google's VN index and knowledge panel), the display name, and the
  // common Western-order variant — so the entity resolves to this page.
  alternateName: ["Huy Le", "Lê Trần Gia Huy", "Gia Huy Le"],
  givenName: "Huy",
  familyName: "Le",
  url: profile.url,
  mainEntityOfPage: profile.url,
  image: `${profile.url}/assets/evan.png`,
  jobTitle: "Software Engineer",
  description: profile.summary,
  email: "letrangiahuy0507@gmail.com",
  nationality: { "@type": "Country", name: "Vietnam" },
  knowsAbout: [
    "React",
    "Next.js",
    "TypeScript",
    "Frontend engineering",
    "AI-native development",
    "Web performance",
    "Design systems",
  ],
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
