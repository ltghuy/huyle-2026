import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { sentence, word } from "@/learning/exercises/fixtures";
import { buildContentIndex } from "@/lib/session/content-index";
import { buyExtraLesson, completeExtraLesson } from "@/lib/session/extra";
import { completeLesson, getOrCreateTodayLesson } from "@/lib/session/today";
import { putCards } from "@/storage/cards";
import { getAllExtraLessons } from "@/storage/extra-lessons";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { ExtraLessonCard } from "./extra-lesson-card";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const words = Array.from({ length: 30 }, (_, i) => word(`w${i}`, { examples: [`sentence:w${i}-1`] }));
const sentences = words.map((w) => sentence(`${w.id.slice(5)}-1`, { tokens: ["I", "like", "the", w.body.headword], wordIds: [w.id], gapCandidates: [3] }));
const index = buildContentIndex([...words, ...sentences]);
const profile = { level: "A1" as const, timeZone: "Asia/Ho_Chi_Minh" };

async function finishDaily() {
  const now = Date.now();
  const lesson = await getOrCreateTodayLesson({ profile, index, contentVersion: 1, now });
  const ids = lesson.plan.flatMap((part) => (part.kind === "new-words" ? part.exercises.map((e) => e.itemIds[0]) : []));
  await putCards([...new Set(ids)].map((id) => makeCard(id as `word:${string}`, now + 86_400_000)));
  await completeLesson(lesson, now);
}

describe("ExtraLessonCard (013)", () => {
  beforeEach(async () => {
    await resetStorage();
    push.mockReset();
  });

  it("stays hidden until today's lesson is done", async () => {
    const { container } = render(<ExtraLessonCard profile={profile} index={index} contentVersion={1} />);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the price and balance, asks to confirm, then takes the points and opens the lesson (AC-003, AC-004)", async () => {
    await finishDaily();
    render(<ExtraLessonCard profile={profile} index={index} contentVersion={1} />);
    expect(await screen.findByText("Dùng điểm để học thêm từ mới hôm nay. Bạn đang có 20 điểm.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Học thêm một bài · 10 điểm" }));
    expect(await screen.findByText(/Bạn còn 10 điểm, và bài tiếp theo hôm nay giá 13 điểm/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dùng 10 điểm" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/extra-lesson"));
    expect((await getAllExtraLessons()).map((e) => e.price)).toEqual([10]);
    expect(await screen.findByRole("link", { name: "Học tiếp bài học thêm" })).toHaveAttribute("href", "/extra-lesson");
  });

  it("disables the button and says how many points are needed (AC-007)", async () => {
    await finishDaily();
    const bought = await buyExtraLesson({ profile, index, contentVersion: 1, now: Date.now() });
    if (bought.status !== "bought") throw new Error(bought.status);
    await completeExtraLesson(bought.lesson.id, Date.now());
    render(<ExtraLessonCard profile={profile} index={index} contentVersion={1} />);
    expect(await screen.findByRole("button", { name: "Học thêm một bài · 13 điểm" })).toBeDisabled();
    expect(screen.getByText(/Bạn cần 13 điểm, bạn đang có 10 điểm/)).toBeInTheDocument();
  });
});
