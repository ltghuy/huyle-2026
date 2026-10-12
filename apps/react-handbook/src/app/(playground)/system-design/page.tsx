import { SectionIndex, sectionMetadata } from "@/components/playground/section-index";

export const metadata = sectionMetadata("system-design");

export default function SystemDesignPage() {
  return (
    <SectionIndex
      id="system-design"
      intro="How senior engineers approach frontend design problems: a repeatable method first, then case studies that apply it. Interactive references, not server demos."
    />
  );
}
