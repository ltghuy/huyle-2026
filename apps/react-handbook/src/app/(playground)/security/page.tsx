import { SectionIndex, sectionMetadata } from "@/components/playground/section-index";

export const metadata = sectionMetadata("security");

export default function SecurityPage() {
  return (
    <SectionIndex
      id="security"
      intro="Short handbooks on how a web app knows who is calling and keeps attackers out: the main concepts, the mistakes behind real incidents, and live demos run against a real server."
    />
  );
}
