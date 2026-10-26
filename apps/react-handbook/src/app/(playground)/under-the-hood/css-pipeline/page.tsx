import { TopicFrame } from "@/components/playground/topic-frame";
import { CssPipelineHandbook } from "@/handbook/css-pipeline/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("css-pipeline");

export default function CssPipelinePage() {
  return (
    <TopicFrame page={getTopicPage("css-pipeline")}>
      <CssPipelineHandbook />
    </TopicFrame>
  );
}
