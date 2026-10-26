import { TopicFrame } from "@/components/playground/topic-frame";
import { MetadataHandbook } from "@/handbook/seo/metadata/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("metadata-structured-data");

export default function MetadataStructuredDataPage() {
  return (
    <TopicFrame page={getTopicPage("metadata-structured-data")}>
      <MetadataHandbook />
    </TopicFrame>
  );
}
