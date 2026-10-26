import { profile } from "@/content/profile";
import { socials } from "@/content/socials";

type Json = Record<string, unknown>;

/**
 * Renders structured data as a JSON-LD <script>. JSON.stringify doesn't escape
 * "<", so a value containing "</script>" could close the tag early; it is
 * escaped as \u003c (the approach the Next.js JSON-LD guide recommends).
 */
export function JsonLd({ data }: Readonly<{ data: Json }>) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replaceAll("<", String.raw`\u003c`),
      }}
    />
  );
}

const PERSON_ID = `${profile.url}/#person`;
const WEBSITE_ID = `${profile.url}/#website`;

/**
 * The site's schema.org graph: one Person (Huy), the WebSite (gives Google the
 * site name shown in results), and a ProfilePage — Google's documented type
 * for a page about one person — whose mainEntity is that Person. Nodes link by
 * @id so crawlers resolve them as a single entity.
 */
export function siteGraph(description: string): Json {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: profile.name,
        // Every name form people search for — the diacritic Vietnamese spelling
        // (used by Google's VN index and knowledge panel), the display name, and
        // the common Western-order variant — so the entity resolves to this page.
        alternateName: ["Huy Le", "Lê Trần Gia Huy", "Gia Huy Le"],
        givenName: "Huy",
        familyName: "Le",
        url: profile.url,
        image: `${profile.url}/assets/evan.png`,
        jobTitle: "Software Engineer",
        description: profile.summary,
        email: "letrangiahuy0507@gmail.com",
        nationality: { "@type": "Country", name: "Vietnam" },
        worksFor: { "@type": "Organization", name: "Naver Vietnam" },
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
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: profile.url,
        name: profile.display,
        alternateName: [profile.name, "huyle.work"],
        description,
        inLanguage: ["en", "vi"],
        publisher: { "@id": PERSON_ID },
      },
      {
        "@type": "ProfilePage",
        "@id": `${profile.url}/#profilepage`,
        url: profile.url,
        name: `${profile.name} (${profile.display})`,
        description,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        mainEntity: { "@id": PERSON_ID },
        dateModified: `${profile.updated}T00:00:00+07:00`,
      },
    ],
  };
}
