import { TopicFrame } from "@/components/playground/topic-frame";
import { BuildPipelineHandbook } from "@/handbook/build-pipeline/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("build-pipeline");

export default function BuildPipelinePage() {
  return (
    <TopicFrame page={getTopicPage("build-pipeline")}>
      <BuildPipelineHandbook />
    </TopicFrame>
  );
}
