// CMUdict ARPAbet → General American IPA, shown as a phonemic transcription
// (/ˈhoʊmˌwɝk/). CMUdict has no syllable breaks, so stress marks are placed
// before each stressed syllable's onset, found with the maximal-onset rule.

const VOWELS: Record<string, string> = {
  AA: "ɑ",
  AE: "æ",
  AH: "ʌ",
  AO: "ɔ",
  AW: "aʊ",
  AY: "aɪ",
  EH: "ɛ",
  ER: "ɝ",
  EY: "eɪ",
  IH: "ɪ",
  IY: "i",
  OW: "oʊ",
  OY: "ɔɪ",
  UH: "ʊ",
  UW: "u",
};

const CONSONANTS: Record<string, string> = {
  B: "b",
  CH: "tʃ",
  D: "d",
  DH: "ð",
  F: "f",
  G: "ɡ",
  HH: "h",
  JH: "dʒ",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ŋ",
  P: "p",
  R: "r",
  S: "s",
  SH: "ʃ",
  T: "t",
  TH: "θ",
  V: "v",
  W: "w",
  Y: "j",
  Z: "z",
  ZH: "ʒ",
};

// Consonant sequences that can start an English syllable (ARPAbet).
const ONSETS = new Set(
  [
    ...Object.keys(CONSONANTS).filter((c) => c !== "NG"),
    "P L", "P R", "B L", "B R", "T R", "D R", "K L", "K R", "G L", "G R", "F L", "F R", "TH R", "SH R",
    "S P", "S T", "S K", "S M", "S N", "S L", "S W", "S F",
    "S P L", "S P R", "S T R", "S K R", "S K W",
    "T W", "D W", "K W", "G W", "TH W",
    "P Y", "B Y", "K Y", "G Y", "F Y", "V Y", "M Y", "HH Y",
  ],
);

interface Phone {
  symbol: string;
  stress?: 0 | 1 | 2;
}

function parse(pron: string): Phone[] {
  return pron
    .trim()
    .split(/\s+/)
    .map((token) => {
      const match = /^([A-Z]+)([012])?$/.exec(token);
      if (!match || !(match[1] in VOWELS || match[1] in CONSONANTS)) {
        throw new Error(`Unknown ARPAbet symbol: ${token}`);
      }
      return { symbol: match[1], stress: match[2] === undefined ? undefined : (Number(match[2]) as 0 | 1 | 2) };
    });
}

function ipaOf(phone: Phone): string {
  if (phone.stress === undefined) return CONSONANTS[phone.symbol];
  // Unstressed AH and ER are the reduced vowels schwa and schwar.
  if (phone.stress === 0 && phone.symbol === "AH") return "ə";
  if (phone.stress === 0 && phone.symbol === "ER") return "ɚ";
  return VOWELS[phone.symbol];
}

/** Converts one CMUdict pronunciation (e.g. "HH OW1 M W ER2 K") to IPA without slashes. */
export function arpabetToIpa(pron: string): string {
  const phones = parse(pron);
  const nuclei = phones.flatMap((phone, i) => (phone.stress === undefined ? [] : [i]));
  // Index where each syllable starts: the first nucleus owns everything before
  // it; later ones take the longest legal onset from the consonants before them.
  const starts = new Map<number, 0 | 1 | 2>();
  nuclei.forEach((nucleus, n) => {
    let start = nucleus;
    if (n === 0) {
      start = 0;
    } else {
      const previous = nuclei[n - 1];
      for (let candidate = previous + 1; candidate < nucleus; candidate++) {
        const cluster = phones.slice(candidate, nucleus).map((phone) => phone.symbol).join(" ");
        if (ONSETS.has(cluster)) {
          start = candidate;
          break;
        }
      }
    }
    starts.set(start, phones[nucleus].stress!);
  });
  return phones
    .map((phone, i) => {
      const stress = starts.get(i);
      const mark = nuclei.length > 1 && stress === 1 ? "ˈ" : nuclei.length > 1 && stress === 2 ? "ˌ" : "";
      return mark + ipaOf(phone);
    })
    .join("");
}
