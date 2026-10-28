import { describe, expect, it } from "vitest";
import { forms, word } from "./fixtures";
import {
  buildFormsGap,
  buildFormsListening,
  buildFormsTyping,
  gradeFormsGap,
  gradeFormsListening,
  gradeFormsTyping,
  ingForm,
  thirdPerson,
} from "./forms";

const go = word("go", { pos: "verb", meaningsVi: ["đi"] });
const goForms = forms("go", ["went"], ["gone"], { audio: "a".repeat(64) });
const learn = word("learn", { pos: "verb", meaningsVi: ["học"] });
const learnForms = forms("learn", ["learned", "learnt"], ["learned", "learnt"]);
const cut = word("cut", { pos: "verb" });
const cutForms = forms("cut", ["cut"], ["cut"]);
const be = word("be", { pos: "be-verb", meaningsVi: ["thì, là, ở"] });
const beForms = forms("be", ["was", "were"], ["been"], {
  practice: [
    { en: "She ___ tired last night.", answer: "past", vi: "x" },
    { en: "I have ___ there.", answer: "participle", vi: "x" },
  ],
});

describe("forms-typing (AC-007, AC-010)", () => {
  it("asks for the past or the participle by seed, on the forms card", () => {
    expect(buildFormsTyping({ forms: goForms, word: go }, 2)).toMatchObject({ targetId: "forms:go", form: "past", verb: { headword: "go", past: ["went"] } });
    expect(buildFormsTyping({ forms: goForms, word: go }, 3).form).toBe("participle");
  });

  it("accepts any accepted spelling, ignoring case and spaces", () => {
    const instance = buildFormsTyping({ forms: learnForms, word: learn, form: "past" }, 0);
    expect(gradeFormsTyping(instance, "learned")).toEqual({ correct: true, expected: "learned / learnt" });
    expect(gradeFormsTyping(instance, " Learnt ")).toMatchObject({ correct: true });
    // The base form is one letter from "learnt", but it is the wrong form, not a typo.
    expect(gradeFormsTyping(instance, "learn")).toEqual({ correct: false, expected: "learned / learnt" });
    const gone = buildFormsTyping({ forms: forms("forgive", ["forgave"], ["forgiven"]), word: word("forgive", { pos: "verb" }), form: "participle" }, 0);
    expect(gradeFormsTyping(gone, "forgave")).toMatchObject({ correct: false });
  });

  it("counts one slip in a form of 5+ letters as a typo, and refuses the base form", () => {
    const instance = buildFormsTyping({ forms: forms("teach", ["taught"], ["taught"]), word: word("teach", { pos: "verb" }), form: "participle" }, 0);
    expect(gradeFormsTyping(instance, "tuaght")).toEqual({ correct: true, typo: true, expected: "taught" });
    const short = buildFormsTyping({ forms: goForms, word: go, form: "past" }, 0);
    expect(gradeFormsTyping(short, "wnet")).toMatchObject({ correct: false });
  });
});

describe("forms-gap (AC-007)", () => {
  it("offers the taught form and three wrong ones, other forms first", () => {
    const instance = buildFormsGap({ forms: goForms, word: go }, 0)!;
    expect(instance.sentence).toBe("Yesterday she ___ home.");
    expect(instance.options[instance.answerIndex]).toBe("went");
    expect([...instance.options].sort()).toEqual(["go", "goed", "gone", "went"]);
    expect(gradeFormsGap(instance, instance.answerIndex)).toEqual({ correct: true, expected: "went" });
  });

  it("never offers an accepted variant as wrong", () => {
    const instance = buildFormsGap({ forms: learnForms, word: learn }, 1)!;
    expect(instance.options).toContain("learned");
    expect(instance.options).not.toContain("learnt");
  });

  it("finds three wrong options when all forms are the same", () => {
    const instance = buildFormsGap({ forms: cutForms, word: cut }, 0)!;
    expect([...instance.options].sort()).toEqual(["cut", "cuts", "cutted", "cutting"]);
  });

  it("uses was for she, without were or beed", () => {
    const instance = buildFormsGap({ forms: beForms, word: be }, 0)!;
    expect(instance.options[instance.answerIndex]).toBe("was");
    expect(instance.options).not.toContain("were");
    expect(instance.options).not.toContain("beed");
    expect([...instance.options].sort()).toEqual(["be", "been", "being", "was"]);
  });

  it("builds -ing and -s forms", () => {
    expect([ingForm("make"), ingForm("lie"), ingForm("cut"), ingForm("see"), ingForm("go")]).toEqual(["making", "lying", "cutting", "seeing", "going"]);
    expect([thirdPerson("go"), thirdPerson("catch"), thirdPerson("fly"), thirdPerson("make")]).toEqual(["goes", "catches", "flies", "makes"]);
  });
});

describe("forms-listening (AC-007)", () => {
  it("plays the verb's clip and offers the written set among three near misses", () => {
    const instance = buildFormsListening({ forms: goForms, word: go }, 4)!;
    expect(instance.audio).toBe("a".repeat(64));
    expect(instance.options).toHaveLength(4);
    expect(instance.options[instance.answerIndex]).toBe("go, went, gone");
    expect(new Set(instance.options).size).toBe(4);
    expect(gradeFormsListening(instance, (instance.answerIndex + 1) % 4)).toEqual({ correct: false, expected: "go, went, gone" });
  });

  it("is skipped without a clip", () => {
    expect(buildFormsListening({ forms: cutForms, word: cut }, 0)).toBeNull();
  });
});
