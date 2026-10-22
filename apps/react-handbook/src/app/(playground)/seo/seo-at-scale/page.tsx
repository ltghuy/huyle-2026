import { TopicFrame } from "@/components/playground/topic-frame";
import { SeoAtScaleHandbook } from "@/handbook/seo/scale/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("seo-at-scale");

export default function SeoAtScalePage() {
  return (
    <TopicFrame page={getTopicPage("seo-at-scale")}>
      <SeoAtScaleHandbook />
    </TopicFrame>
  );
}
