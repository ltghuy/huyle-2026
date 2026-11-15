import { describe, expect, it } from "vitest";
import { buildHintRequest, MAX_AI_HINTS, parseHintReply } from "./hint-ai";

const EN = "The revelation that he had a twin brother shocked everyone.";
const reply = (hintsVi: unknown, finishReason = "STOP") => ({ candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify({ hintsVi }) }] } }] });

describe("AI grammar hints (feature 043)", () => {
  it("asks for tense and structure hints that never give the answer away (AC-006, AC-007)", () => {
    const body = buildHintRequest({ vi: "Việc tiết lộ … khiến mọi người sửng sốt.", en: EN }, "json-schema");
    expect(body.contents[0].parts[0].text).toBe(`Vietnamese sentence: Việc tiết lộ … khiến mọi người sửng sốt.\nReference translation: ${EN}`);
    const system = body.systemInstruction.parts[0].text;
    expect(system).toMatch(/which tense to use/);
    expect(system).toMatch(/Never write the English translation/);
    expect(body.generationConfig).toMatchObject({ responseMimeType: "application/json", maxOutputTokens: 384 });
  });

  it("keeps up to three trimmed hints", () => {
    const hints = ["Dùng thì quá khứ đơn (Past Simple) vì sự việc đã xảy ra. ", "Mệnh đề danh từ (Noun Clause) làm rõ chủ ngữ.", "c", "d"];
    expect(parseHintReply(reply(hints), EN)).toEqual(["Dùng thì quá khứ đơn (Past Simple) vì sự việc đã xảy ra.", "Mệnh đề danh từ (Noun Clause) làm rõ chủ ngữ.", "c"].slice(0, MAX_AI_HINTS));
  });

  it("drops a hint that names a word of the answer, and fails when none is left (AC-007)", () => {
    expect(parseHintReply(reply(['Câu ở quá khứ nên dùng "shocked".', "Dùng thì quá khứ đơn (Past Simple)."]), EN)).toEqual(["Dùng thì quá khứ đơn (Past Simple)."]);
    expect(parseHintReply(reply(['Dùng "Shocked" ở quá khứ.']), EN)).toBeNull();
    // Short words such as "had" or "a" are grammar, not the answer.
    expect(parseHintReply(reply(['Dùng "had" cho quá khứ hoàn thành (Past Perfect).']), EN)).toEqual(['Dùng "had" cho quá khứ hoàn thành (Past Perfect).']);
  });

  it("refuses cut-off or unreadable replies", () => {
    expect(parseHintReply(reply(["x"], "MAX_TOKENS"), EN)).toBeNull();
    expect(parseHintReply(reply("not a list"), EN)).toBeNull();
    expect(parseHintReply(reply([]), EN)).toBeNull();
  });
});
