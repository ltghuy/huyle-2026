// Irregular verb forms exercises (feature 008): type the past or the past
// participle of a verb, choose the right form for a sentence, and listen to
// "go, went, gone" and choose how it is written. Every one trains the verb's
// `forms:` card, never the word's meaning card.
import { normalize } from "../normalize";
import { acceptedForms, formsSequence, listeningDistractors, regularPast, type FormsItem, type VerbForm } from "../verbs";
import { createRng, shuffle } from "./random";
import { damerauLevenshtein, TYPO_MIN_LENGTH } from "./recall";
import type { GradeResult, WordItem } from "./types";

export const FORMS_OPTIONS = 4;

/** What a forms exercise shows about the verb once it is checked. */
export interface VerbSummary {
  headword: string;
  meaningsVi: string[];
  past: string[];
  participle: string[];
  audio: string;
}

function summaryOf(forms: FormsItem, word: WordItem): VerbSummary {
  return {
    headword: word.body.headword,
    meaningsVi: [...word.body.meaningsVi],
    past: acceptedForms(forms.body, "past"),
    participle: acceptedForms(forms.body, "participle"),
    audio: forms.body.audio,
  };
}

// ---------- type the form ----------

export interface FormsTypingInstance {
  kind: "forms-typing";
  targetId: string;
  form: VerbForm;
  verb: VerbSummary;
}

/** `form` defaults to past or participle by `seed`, so reviews alternate. */
export function buildFormsTyping(input: { forms: FormsItem; word: WordItem; form?: VerbForm }, seed: number): FormsTypingInstance {
  const form = input.form ?? (Math.abs(seed) % 2 === 0 ? "past" : "participle");
  return { kind: "forms-typing", targetId: input.forms.id, form, verb: summaryOf(input.forms, input.word) };
}

/**
 * Any accepted spelling counts (learned or learnt); one slip in a form of 5+
 * letters is a typo (Hard). The verb's other forms are mistakes, never typos:
 * "learn" is one letter from "learnt" but is the wrong form.
 */
export function gradeFormsTyping(instance: FormsTypingInstance, typed: string): GradeResult {
  const accepted = instance.verb[instance.form];
  const expected = accepted.join(" / ");
  const answer = normalize(typed);
  if (accepted.some((form) => normalize(form) === answer)) return { correct: true, expected };
  const otherForms = [instance.verb.headword, ...instance.verb.past, ...instance.verb.participle].map(normalize);
  if (otherForms.includes(answer)) return { correct: false, expected };
  const typo = answer !== "" && accepted.some((form) => [...normalize(form)].length >= TYPO_MIN_LENGTH && damerauLevenshtein(answer, normalize(form)) === 1);
  return typo ? { correct: true, typo: true, expected } : { correct: false, expected };
}

// ---------- choose the form for a sentence ----------

export interface FormsGapInstance {
  kind: "forms-gap";
  targetId: string;
  /** English sentence with "___" where the form goes. */
  sentence: string;
  vi: string;
  options: string[];
  answerIndex: number;
  verb: VerbSummary;
}

/** go → going, make → making, lie → lying, cut → cutting. */
export function ingForm(base: string): string {
  const word = base.toLowerCase();
  if (word.endsWith("ie")) return `${word.slice(0, -2)}ying`;
  if (word.endsWith("e") && !word.endsWith("ee") && word.length > 2) return `${word.slice(0, -1)}ing`;
  if (/^[^aeiou]*[aeiou][bdgmnpt]$/.test(word)) return `${word}${word.at(-1)}ing`;
  return `${word}ing`;
}

/** go → goes, catch → catches, fly → flies, make → makes. */
export function thirdPerson(base: string): string {
  const word = base.toLowerCase();
  if (/(s|sh|ch|x|o)$/.test(word)) return `${word}es`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/**
 * One of the verb's practice sentences (by `seed`), with the taught form of
 * the asked kind and three wrong ones: the other forms first, then the
 * regular -ed mistake, -ing and -s. Accepted variants are never offered as
 * wrong. Null when fewer than four distinct options exist.
 */
export function buildFormsGap(input: { forms: FormsItem; word: WordItem }, seed: number): FormsGapInstance | null {
  const { forms, word } = input;
  const rng = createRng(seed);
  const practice = forms.body.practice[Math.abs(seed) % forms.body.practice.length];
  const accepted = new Set(acceptedForms(forms.body, practice.answer).map((form) => form.toLowerCase()));
  const answer = forms.body[practice.answer][0].text;
  const base = word.body.headword;
  const other = practice.answer === "past" ? "participle" : "past";
  const candidates = [
    base,
    ...acceptedForms(forms.body, other),
    // "beed" is not a mistake anyone makes.
    ...(base === "be" ? [] : [regularPast(base)]),
    ingForm(base),
    thirdPerson(base),
  ];
  const options = [answer];
  for (const candidate of candidates) {
    if (options.length === FORMS_OPTIONS) break;
    const key = candidate.toLowerCase();
    if (accepted.has(key) || options.some((option) => option.toLowerCase() === key)) continue;
    options.push(candidate);
  }
  if (options.length < FORMS_OPTIONS) return null;
  const shuffled = shuffle(options, rng);
  return {
    kind: "forms-gap",
    targetId: forms.id,
    sentence: practice.en,
    vi: practice.vi,
    options: shuffled,
    answerIndex: shuffled.indexOf(answer),
    verb: summaryOf(forms, word),
  };
}

export function gradeFormsGap(instance: FormsGapInstance, chosenIndex: number): GradeResult {
  return { correct: chosenIndex === instance.answerIndex, expected: instance.options[instance.answerIndex] };
}

// ---------- listen and choose the spelling ----------

export interface FormsListeningInstance {
  kind: "forms-listening";
  targetId: string;
  audio: string;
  /** "go, went, gone" and three near misses. */
  options: string[];
  answerIndex: number;
  verb: VerbSummary;
}

/** Null without a clip or without three near misses. */
export function buildFormsListening(input: { forms: FormsItem; word: WordItem }, seed: number): FormsListeningInstance | null {
  const { forms, word } = input;
  if (!forms.body.audio) return null;
  const answer = formsSequence(word.body.headword, forms.body);
  const wrong = listeningDistractors(word.body.headword, forms.body, seed);
  if (wrong.length < FORMS_OPTIONS - 1) return null;
  const options = shuffle([answer, ...wrong], createRng(seed));
  return {
    kind: "forms-listening",
    targetId: forms.id,
    audio: forms.body.audio,
    options,
    answerIndex: options.indexOf(answer),
    verb: summaryOf(forms, word),
  };
}

export function gradeFormsListening(instance: FormsListeningInstance, chosenIndex: number): GradeResult {
  return { correct: chosenIndex === instance.answerIndex, expected: instance.options[instance.answerIndex] };
}
