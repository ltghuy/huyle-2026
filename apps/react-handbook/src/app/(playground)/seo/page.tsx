import { SectionIndex, sectionMetadata } from "@/components/playground/section-index";

export const metadata = sectionMetadata("seo");

export default function SeoPage() {
  return (
    <SectionIndex
      id="seo"
      intro="Short handbooks on how people and machines find this site: how search engines crawl, index and rank pages, how to control what they see, and how AI assistants read and cite the web. Each page sets up for real on this site what it explains, going from the basics to senior-level work."
    />
  );
}
