import { TopicFrame } from "@/components/playground/topic-frame";
import { JwtHandbook } from "@/handbook/jwt/content";
import { getTopicPage, topicMetadata } from "@/practices/catalog";

export const metadata = topicMetadata("jwt");

export default function JwtPage() {
  return (
    <TopicFrame page={getTopicPage("jwt")}>
      <JwtHandbook />
    </TopicFrame>
  );
}
