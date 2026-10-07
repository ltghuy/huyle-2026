import { PracticeFrame } from "@/components/playground/practice-frame";
import { getPractice, practiceMetadata } from "@/practices/catalog";
import { Demo } from "@/practices/file-upload/demo";
import { Explanation } from "@/practices/file-upload/explanation";

export const metadata = practiceMetadata("file-upload");

export default function FileUploadPage() {
  return (
    <PracticeFrame
      practice={getPractice("file-upload")!}
      explanation={<Explanation />}
      demo={<Demo />}
    />
  );
}
