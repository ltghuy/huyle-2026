import { describe, expect, it } from "vitest";
import { sentence } from "./fixtures";
import { answerKeys, buildTranslate, canClaim, canTranslate, claimKey, gradeTranslate } from "./translate";

const eyes = sentence("eyes", { tokens: ["Close", "your", "eyes", "and", "imagine", "the", "sea."], vi: "Nhắm mắt lại và tưởng tượng biển cả." });

function grade(text: string, instance = buildTranslate({ sentence: eyes })!) {
  return gradeTranslate(instance, { text });
}

describe("translate (016)", () => {
  it("shows the Vietnamese and keeps the English for grading (AC-001)", () => {
    expect(buildTranslate({ sentence: eyes })).toMatchObject({
      kind: "translate",
      sentenceId: "sentence:eyes",
      vi: "Nhắm mắt lại và tưởng tượng biển cả.",
      en: "Close your eyes and imagine the sea.",
    });
  });

  it("forgives case, punctuation, spacing and curly apostrophes, and nothing else (AC-002)", () => {
    expect(grade("close your eyes and imagine the sea")).toMatchObject({ correct: true, expected: "Close your eyes and imagine the sea." });
    expect(grade("  Close  your eyes, and imagine the sea!  ").correct).toBe(true);
    expect(grade("Close your eye and imagine the sea.").correct).toBe(false);
    expect(grade("Shut your eyes and imagine the sea.").correct).toBe(false);
    expect(grade("Close your eyes and imagine the see.").correct).toBe(false); // no typo tolerance
    expect(grade("").correct).toBe(false);
  });

  it("treats a contraction and its full form as the same answer (AC-002)", () => {
    const tea = buildTranslate({ sentence: sentence("tea", { tokens: ["I", "don't", "like", "tea."] }) })!;
    expect(grade("I do not like tea", tea).correct).toBe(true);
    expect(grade("I don’t like tea.", tea).correct).toBe(true);
    expect(grade("I dont like tea", tea).correct).toBe(true);
    const full = buildTranslate({ sentence: sentence("he", { tokens: ["He", "is", "tired."] }) })!;
    expect(grade("He's tired.", full).correct).toBe(true);
    expect(grade("He has tired.", full).correct).toBe(false);
  });

  it("accepts the sentence's other word orders and the approved wordings (AC-004)", () => {
    const today = sentence("today", { tokens: ["Today", "I", "work."], acceptedOrders: [[0, 1, 2], [1, 2, 0]] });
    expect(grade("I work today.", buildTranslate({ sentence: today })!).correct).toBe(true);
    const withWording = buildTranslate({ sentence: eyes, wordings: ["Shut your eyes and picture the sea."] })!;
    expect(grade("shut your eyes and picture the sea", withWording).correct).toBe(true);
  });

  it("explains an approved wording when the answer matches it, never the course's own English (042 AC-006, AC-008)", () => {
    const reason = "“Shut” = “close”, “picture” = “imagine”.";
    const instance = buildTranslate({
      sentence: eyes,
      wordings: ["Shut your eyes and picture the sea.", "Close your eyes and picture the sea."],
      explanationsVi: { "Shut your eyes and picture the sea.": reason },
    })!;
    expect(grade("shut your eyes, and picture the sea", instance)).toEqual({ correct: true, expected: "Close your eyes and imagine the sea.", explanationVi: reason });
    // An approved wording without an explanation, and the own English: just right.
    expect(grade("Close your eyes and picture the sea.", instance)).not.toHaveProperty("explanationVi");
    expect(grade("Close your eyes and imagine the sea.", instance)).not.toHaveProperty("explanationVi");
    expect(grade("Shut the door.", instance)).toEqual({ correct: false, expected: "Close your eyes and imagine the sea." });
    // A wording explained under the own English's key never explains the own English.
    const same = buildTranslate({ sentence: eyes, wordings: ["Close your eyes and imagine the sea"], explanationsVi: { "Close your eyes and imagine the sea": "x" } })!;
    expect(same).not.toHaveProperty("explanations");
  });

  it("keeps the reviewed card in Ôn tập", () => {
    expect(buildTranslate({ sentence: eyes, cardId: "word:sea" })).toMatchObject({ cardId: "word:sea" });
    expect(buildTranslate({ sentence: eyes })).not.toHaveProperty("cardId");
  });

  it("needs a Vietnamese prompt", () => {
    expect(canTranslate(eyes)).toBe(true);
    const blank = sentence("blank", { tokens: ["Hi", "there."], vi: " " });
    expect(canTranslate(blank)).toBe(false);
    expect(buildTranslate({ sentence: blank })).toBeNull();
  });

  it("allows a claim only for a non-blank answer at most 3 times the sentence, and 500 characters (AC-010)", () => {
    const en = "Close your eyes and imagine the sea."; // 36 characters
    expect(canClaim({ en }, "Shut your eyes and picture the sea.")).toBe(true);
    expect(canClaim({ en }, "   ")).toBe(false);
    expect(canClaim({ en }, "a".repeat(108))).toBe(true);
    expect(canClaim({ en }, "a".repeat(109))).toBe(false);
    expect(canClaim({ en: "x".repeat(400) }, "a".repeat(501))).toBe(false);
  });

  it("groups claims that differ only in what grading forgives", () => {
    expect(claimKey("Shut your eyes, and picture the sea!")).toBe(claimKey("shut your eyes and picture the sea"));
    expect(claimKey("I don't know.")).toBe(claimKey("I do not know"));
    expect(answerKeys("He's here")).toEqual(expect.arrayContaining(["hes here", "he is here", "he has here"]));
  });
});
