import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

// Structured data as JSON-LD. JSON.stringify doesn't escape "<", so a value
// containing "</script>" could end the tag early; it's escaped as <.

type Json = Record<string, unknown>;

export function JsonLd({ data }: { data: Json }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** The home page's graph: the site, and the free course it offers. */
export function homeLd(): Json {
  const author = { "@type": "Person", "@id": `${AUTHOR.url}/#person`, name: AUTHOR.name, url: AUTHOR.url };
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION, inLanguage: "vi", publisher: author },
      {
        "@type": "Course",
        "@id": `${SITE_URL}/#course`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        inLanguage: "vi",
        teaches: "English vocabulary, grammar and irregular verbs, CEFR A1 to C1",
        educationalLevel: "A1–C1",
        isAccessibleForFree: true,
        provider: author,
      },
    ],
  };
}
