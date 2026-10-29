import { describe, expect, it } from "vitest";
import { sentence, vocabSet, word } from "@/learning/exercises/fixtures";
import { buildContentIndex } from "./content-index";

const deploy = word("deploy", { source: "specialized", examples: ["sentence:deploy-1"] }, "A2");
const deployExample = sentence("deploy-1", { tokens: ["We", "deploy", "today"] });
const meeting = word("meeting", {}, "A1");

describe("buildContentIndex with vocabulary sets", () => {
  it("puts embedded words and sentences in byId but not in the level lists", () => {
    const index = buildContentIndex([vocabSet("it", [deploy], [deployExample])]);
    expect(index.byId.get(deploy.id)).toEqual(deploy);
    expect(index.byId.get(deployExample.id)).toEqual(deployExample);
    expect(index.wordsByLevel.A2).toEqual([]);
    expect(index.lesson.sentences).toEqual([]);
    expect(index.lesson.setSentences).toEqual([deployExample]);
  });

  it("prefers a loaded level item over its embedded copy", () => {
    const levelCopy = { ...meeting, sort: 5 };
    const index = buildContentIndex([levelCopy, vocabSet("office", [meeting])]);
    expect(index.byId.get(meeting.id)).toBe(levelCopy);
    expect(index.sets[0].words[0]).toBe(levelCopy);
  });

  it("resolves words in the set's order and maps a word to every set it is in", () => {
    const index = buildContentIndex([vocabSet("office", [meeting, deploy], [], 1), vocabSet("it", [deploy, meeting], [], 0)]);
    expect(index.sets.map((set) => set.item.id)).toEqual(["set:it", "set:office"]);
    expect(index.sets[0].words.map((item) => item.id)).toEqual([deploy.id, meeting.id]);
    expect(index.setsByWord.get(meeting.id)).toEqual(["set:it", "set:office"]);
    expect(index.lesson.setWords?.get("set:office")?.map((item) => item.id)).toEqual([meeting.id, deploy.id]);
  });

  it("drops a tombstoned set and tombstoned embedded items", () => {
    const tombstoned = buildContentIndex([vocabSet("it", [deploy])], new Set(["set:it"]));
    expect(tombstoned.sets).toEqual([]);
    expect(tombstoned.byId.has(deploy.id)).toBe(false);

    const wordGone = buildContentIndex([vocabSet("it", [deploy, meeting])], new Set([deploy.id]));
    expect(wordGone.sets[0].words.map((item) => item.id)).toEqual([meeting.id]);
    expect(wordGone.setsByWord.has(deploy.id)).toBe(false);
  });
});
