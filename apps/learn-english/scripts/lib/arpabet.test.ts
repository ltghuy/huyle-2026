import { describe, expect, it } from "vitest";
import { arpabetToIpa } from "./arpabet";

describe("arpabetToIpa", () => {
  it.each([
    ["HH OW1 M W ER2 K", "ˈhoʊmˌwɝk"], // homework
    ["K AE1 T", "kæt"], // cat: one syllable, no stress mark
    ["AH0 B AW1 T", "əˈbaʊt"], // about
    ["W AO1 T ER0", "ˈwɔtɚ"], // water
    ["IH0 K S T R AO1 R D AH0 N EH2 R IY0", "ɪkˈstrɔrdəˌnɛri"], // extraordinary: "k s t r" → onset "s t r"
    ["B AH1 T ER0 F L AY2", "ˈbʌtɚˌflaɪ"], // butterfly: onset "f l"
    ["M Y UW1 Z IH0 K", "ˈmjuzɪk"], // music: onset "m y"
    ["S IH1 NG ER0", "ˈsɪŋɚ"], // singer: NG never starts a syllable
    ["IH2 N F ER0 M EY1 SH AH0 N", "ˌɪnfɚˈmeɪʃən"], // information
  ])("%s → %s", (pron, ipa) => {
    expect(arpabetToIpa(pron)).toBe(ipa);
  });

  it("rejects unknown symbols", () => {
    expect(() => arpabetToIpa("K XX1 T")).toThrow("Unknown ARPAbet symbol");
  });
});
