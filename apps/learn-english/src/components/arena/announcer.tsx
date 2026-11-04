import type { PublicRoom, QuestionType } from "@/learning/arena/protocol";

export const QUESTION_LABELS: Record<QuestionType, string> = {
  listen: "Nghe và chọn từ",
  recall: "Nhớ lại từ",
  write: "Viết câu",
};

function nameOf(room: PublicRoom, id: string | null, me: string): string {
  if (id === me) return "Bạn";
  return room.players.find((p) => p.id === id)?.name ?? "Đối thủ";
}

/** What screen readers hear when the room changes: the question, who scored and the answer, results. Pure, for tests. */
export function announcement(room: PublicRoom, me: string): string {
  switch (room.phase) {
    case "countdown":
      return "Trận đấu sắp bắt đầu.";
    case "question": {
      const type = room.questionType ? QUESTION_LABELS[room.questionType] : "";
      if (room.suddenDeath > 0) return `Câu quyết định. ${type}.`;
      return `Câu ${room.questionIndex + 1} trên ${room.questionCount}. ${type}.`;
    }
    case "reveal": {
      if (!room.reveal) return "";
      const who = room.reveal.answeredBy ? `${nameOf(room, room.reveal.answeredBy, me)} trả lời đúng trước.` : "Hết giờ, không ai đúng.";
      return `${who} Đáp án: ${room.reveal.answer}.`;
    }
    case "round-end": {
      const last = room.rounds[room.rounds.length - 1];
      return last ? `Hết hiệp ${last.round}. ${nameOf(room, last.winnerId, me)} thắng hiệp này.` : "";
    }
    case "paused":
      return room.pausedFor === me ? "" : `Trận đấu tạm dừng. Đang chờ ${nameOf(room, room.pausedFor, me)} kết nối lại.`;
    case "match-end":
      return room.winnerId === me ? "Bạn thắng trận đấu!" : `${nameOf(room, room.winnerId, me)} thắng trận đấu.`;
    default:
      return "";
  }
}

/** A polite live region with the room's latest announcement; the visual timer and scoreboard stay quiet. */
export function Announcer({ room, me }: { room: PublicRoom; me: string }) {
  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement(room, me)}
    </p>
  );
}
