import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/realtime-chat/demo";
import { Explanation } from "@/practices/realtime-chat/explanation";

export const metadata = practiceMetadata("realtime-chat");

export default function RealtimeChatPage() {
  return (
    <PracticeFrame
      practice={getPractice("realtime-chat")!}
      explanation={<Explanation />}
      demo={<Demo />}
    />
  );
}
