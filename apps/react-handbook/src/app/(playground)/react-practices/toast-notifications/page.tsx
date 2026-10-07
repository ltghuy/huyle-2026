import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/toast-notifications/demo";
import { Explanation } from "@/practices/toast-notifications/explanation";

export const metadata = practiceMetadata("toast-notifications");

export default function ToastNotificationsPage() {
  return (
    <PracticeFrame
      practice={getPractice("toast-notifications")!}
      explanation={<Explanation />}
      demo={<Demo />}
    />
  );
}
