// Builds the owner's review page for one level (`pnpm content:review sheet A1`):
// a self-contained HTML file listing every draft as a review unit (a word or a
// grammar topic with its example sentences, a writing task, or an irregular
// verb's forms). The owner marks
// each unit OK or "Needs fix" with a note; marks live in the browser's
// localStorage, keyed by a hash of the unit's content so an edited unit asks
// again. "Download decisions" saves a JSON file that `approve --ids-file` reads.
import { createHash } from "node:crypto";
import type { SourceItem } from "../../src/content/schema";

export interface ReviewUnit {
  /** The unit's main item id (word, grammar or writing). */
  id: string;
  kind: "word" | "grammar" | "writing" | "forms";
  /** Every id approved together with the unit: the main item and its sentences. */
  ids: string[];
  /** Short hash of the unit's content; a changed unit drops its old mark. */
  hash: string;
  flagged: boolean;
  topic: string;
  item: SourceItem;
  sentences: SourceItem[];
  /** For forms: the verb's base form, from its word item. */
  headword?: string;
}

export interface Decisions {
  level: string;
  /** Ids to approve (units marked OK, sentences included). */
  approve: string[];
  /** Units marked "Needs fix", with the owner's note. */
  fix: { id: string; note: string }[];
}

/** Groups a level's drafts into review units, flagged ones first, then by topic and id. */
export function reviewUnits(items: readonly SourceItem[]): ReviewUnit[] {
  const sentences = new Map(items.filter((item) => item.kind === "sentence").map((item) => [item.id, item]));
  const headwords = new Map(items.flatMap((item) => (item.kind === "word" ? [[item.id, item.body.headword] as const] : [])));
  const units: ReviewUnit[] = [];
  for (const item of items) {
    if (item.status !== "draft") continue;
    if (item.kind !== "word" && item.kind !== "grammar" && item.kind !== "writing" && item.kind !== "forms") continue;
    const own = item.kind === "writing" || item.kind === "forms" ? [] : item.body.examples.flatMap((id) => sentences.get(id) ?? []);
    const pending = own.filter((sentence) => sentence.status === "draft");
    const hash = createHash("sha256").update(JSON.stringify([item, own])).digest("hex").slice(0, 12);
    units.push({
      id: item.id,
      kind: item.kind,
      ids: [item.id, ...pending.map((sentence) => sentence.id)],
      hash,
      flagged: Boolean(item.reviewNotes?.length),
      topic: item.kind === "word" ? (item.topic ?? "") : item.kind,
      item,
      sentences: own,
      ...(item.kind === "forms" ? { headword: headwords.get(item.body.wordId) ?? item.body.wordId.replace(/^word:|-v$/g, "") } : {}),
    });
  }
  const order = { grammar: 0, writing: 1, forms: 2, word: 3 } as const;
  return units.sort(
    (a, b) =>
      Number(b.flagged) - Number(a.flagged) ||
      order[a.kind] - order[b.kind] ||
      a.topic.localeCompare(b.topic) ||
      a.id.localeCompare(b.id),
  );
}

/** Reads a decisions file (or a plain id array) into the ids to approve. */
export function idsFromDecisions(json: unknown): string[] {
  if (Array.isArray(json)) return json.filter((id): id is string => typeof id === "string");
  if (json && typeof json === "object" && Array.isArray((json as Decisions).approve)) {
    return (json as Decisions).approve.filter((id): id is string => typeof id === "string");
  }
  throw new Error("The ids file must be a JSON array of ids or a decisions file with an `approve` array");
}

/** The review page. Data is embedded as JSON; `</` is escaped so it can't close the script tag. */
export function buildSheet(level: string, units: readonly ReviewUnit[], topicTitles: Record<string, string>): string {
  const data = JSON.stringify({ level, units, topicTitles }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review ${level}</title>
<style>${STYLE}</style>
</head>
<body>
<header>
  <h1>Review ${level}</h1>
  <p id="counts"></p>
  <nav>
    <label>Show <select id="filter">
      <option value="undecided">Undecided</option>
      <option value="flagged">Flagged</option>
      <option value="fix">Needs fix</option>
      <option value="ok">OK</option>
      <option value="all">All</option>
    </select></label>
    <label>Kind <select id="kind">
      <option value="all">All</option>
      <option value="grammar">Grammar</option>
      <option value="writing">Writing</option>
      <option value="forms">Verb forms</option>
      <option value="word">Words</option>
    </select></label>
    <input id="search" type="search" placeholder="Search English or Vietnamese">
    <button id="okPage" type="button">Mark shown undecided as OK</button>
    <button id="download" type="button" class="primary">Download decisions</button>
  </nav>
</header>
<main id="list"></main>
<script type="application/json" id="data">${data}</script>
<script>${SCRIPT}</script>
</body>
</html>
`;
}

const STYLE = `
:root { --bg: #fafaf9; --card: #fff; --fg: #1c1917; --muted: #57534e; --line: #e7e5e4; --ok: #15803d; --fix: #b45309; --bad: #b91c1c; --accent: #1d4ed8; }
@media (prefers-color-scheme: dark) { :root { --bg: #1c1917; --card: #292524; --fg: #f5f5f4; --muted: #a8a29e; --line: #44403c; --ok: #4ade80; --fix: #fbbf24; --bad: #f87171; --accent: #93c5fd; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; }
header { position: sticky; top: 0; z-index: 1; background: var(--bg); border-bottom: 1px solid var(--line); padding: 12px 16px; }
h1 { margin: 0; font-size: 18px; }
#counts { margin: 4px 0 8px; color: var(--muted); }
nav { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
select, input, button, textarea { font: inherit; color: inherit; background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 6px 10px; }
input[type=search] { flex: 1 1 200px; }
button { cursor: pointer; }
button.primary { background: var(--accent); color: var(--bg); border-color: var(--accent); }
main { max-width: 900px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
article { background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--line); border-radius: 8px; padding: 12px 16px; content-visibility: auto; contain-intrinsic-size: auto 320px; }
article.ok { border-left-color: var(--ok); }
article.fix { border-left-color: var(--fix); }
.head { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
.head h2 { margin: 0; font-size: 20px; }
.tag { font-size: 12px; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 0 8px; }
.notes { margin: 8px 0; padding: 6px 10px; border-radius: 6px; background: color-mix(in srgb, var(--fix) 14%, transparent); }
.muted { color: var(--muted); }
.sentence { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--line); }
.en { font-size: 17px; }
.gap { text-decoration: underline 2px var(--accent); text-underline-offset: 3px; }
ul { margin: 4px 0; padding-left: 20px; }
.wrong { color: var(--bad); }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; align-items: flex-start; }
.actions textarea { flex: 1 1 260px; min-height: 38px; }
.actions button[aria-pressed=true].okb { background: var(--ok); color: var(--bg); border-color: var(--ok); }
.actions button[aria-pressed=true].fixb { background: var(--fix); color: var(--bg); border-color: var(--fix); }
.empty { text-align: center; color: var(--muted); padding: 40px 0; }
`;

const SCRIPT = `
const { level, units, topicTitles } = JSON.parse(document.getElementById("data").textContent);
const storeKey = "learn-english-review:" + level;
let marks = {};
try { marks = JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch {}
const save = () => { try { localStorage.setItem(storeKey, JSON.stringify(marks)); } catch {} };
const markOf = (unit) => { const mark = marks[unit.id]; return mark && mark.hash === unit.hash ? mark : null; };
const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const list = document.getElementById("list");
const filter = document.getElementById("filter");
const kind = document.getElementById("kind");
const search = document.getElementById("search");

function sentenceHtml(s) {
  const b = s.body;
  const gaps = new Set(b.gapCandidates);
  const en = b.tokens.map((t, i) => gaps.has(i) ? '<span class="gap">' + esc(t) + "</span>" : esc(t)).join(" ");
  const others = b.acceptedOrders.slice(1).map((order) => order.map((i) => b.tokens[i]).join(" "));
  return '<div class="sentence"><div class="en">' + esc(b.en) + '</div><div class="muted">' + esc(b.vi) + "</div>" +
    '<div class="muted">Tiles: ' + en + " (underlined = gap words)</div>" +
    (others.length ? '<div class="muted">Also accepted: ' + others.map(esc).join(" / ") + "</div>" : "") +
    (b.wrongVariants.length ? "<ul>" + b.wrongVariants.map((v) => '<li><span class="wrong">' + esc(v.en) + "</span>: " + esc(v.explanationVi) + "</li>").join("") + "</ul>" : "") +
    "</div>";
}

function bodyHtml(unit) {
  const it = unit.item, b = it.body;
  if (unit.kind === "word") {
    return '<div class="head"><h2>' + esc(b.headword) + '</h2><span class="muted">' + esc(b.pos) + " · " + esc(b.ipa || "(no IPA)") + '</span><span class="tag">' + esc(topicTitles[it.topic] || it.topic) + "</span></div>" +
      "<div>" + b.meaningsVi.map(esc).join("; ") + "</div>" +
      (b.variants.length ? '<div class="muted">Variants: ' + b.variants.map(esc).join(", ") + "</div>" : "") +
      (b.synonyms.length ? '<div class="muted">Synonyms: ' + b.synonyms.map((id) => esc(id.replace(/^word:/, ""))).join(", ") + "</div>" : "");
  }
  if (unit.kind === "grammar") {
    return '<div class="head"><h2>' + esc(b.titleEn) + '</h2><span class="muted">' + esc(b.titleVi) + '</span><span class="tag">grammar</span></div>' +
      "<p>" + esc(b.ruleVi) + "</p>" +
      "<ul>" + b.pattern.map((p) => "<li><b>" + esc(p.form) + ":</b> " + esc(p.en) + "</li>").join("") + "</ul>" +
      "<b>Usage</b><ul>" + b.usageVi.map((u) => "<li>" + esc(u) + "</li>").join("") + "</ul>" +
      (b.signalWords.length ? '<div class="muted">Signal words: ' + b.signalWords.map(esc).join(", ") + "</div>" : "") +
      "<b>Common mistakes</b><ul>" + b.mistakes.map((m) => '<li><span class="wrong">' + esc(m.wrong) + "</span> → " + esc(m.right) + ": " + esc(m.explanationVi) + "</li>").join("") + "</ul>" +
      "<b>Practice</b><ul>" + b.practice.map((p) => "<li>" + esc(p.prompt) + (p.options ? ' <span class="muted">[' + p.options.map(esc).join(" | ") + "]</span>" : ' <span class="muted">(typed)</span>') + " → <b>" + esc(p.answer) + "</b>: " + esc(p.explanationVi) + "</li>").join("") + "</ul>";
  }
  if (unit.kind === "forms") {
    const list = (forms) => forms.map((f) => esc(f.text) + (f.region ? " (" + f.region.toUpperCase() + " only)" : "") + (f.ipa ? ' <span class="muted">' + esc(f.ipa) + "</span>" : "")).join(" / ");
    return '<div class="head"><h2>' + esc(unit.headword) + " – " + esc(b.past[0].text) + " – " + esc(b.participle[0].text) + '</h2><span class="tag">verb forms</span></div>' +
      "<div><b>Past:</b> " + list(b.past) + "</div><div><b>Past participle:</b> " + list(b.participle) + "</div>" +
      (b.noteVi ? '<div class="muted">Note: ' + esc(b.noteVi) + "</div>" : "") +
      "<b>Practice</b><ul>" + b.practice.map((p) => "<li>" + esc(p.en) + " → <b>" + esc(p.answer === "past" ? b.past[0].text : b.participle[0].text) + '</b> <span class="muted">(' + esc(p.answer) + ") " + esc(p.vi) + "</span></li>").join("") + "</ul>";
  }
  return '<div class="head"><h2>' + esc(b.promptVi) + '</h2><span class="tag">writing</span></div>' +
    "<ul>" + b.modelAnswers.map((a) => "<li>" + esc(a) + "</li>").join("") + "</ul>" +
    '<div class="muted">Practises: ' + b.useItems.map((id) => esc(id.replace(/^word:/, ""))).join(", ") + "</div>";
}

function unitHtml(unit) {
  const mark = markOf(unit);
  const state = mark ? mark.state : "";
  return '<article id="' + esc(unit.id) + '" class="' + state + '">' + bodyHtml(unit) +
    (unit.item.reviewNotes ? '<div class="notes">' + unit.item.reviewNotes.map(esc).join("<br>") + "</div>" : "") +
    unit.sentences.map(sentenceHtml).join("") +
    '<div class="actions"><button type="button" class="okb" data-act="ok" aria-pressed="' + (state === "ok") + '">OK</button>' +
    '<button type="button" class="fixb" data-act="fix" aria-pressed="' + (state === "fix") + '">Needs fix</button>' +
    '<textarea placeholder="What should change? (saved with Needs fix)">' + esc(mark && mark.note || "") + "</textarea>" +
    '<span class="muted">' + esc(unit.id) + "</span></div></article>";
}

function visible() {
  const q = search.value.trim().toLowerCase();
  return units.filter((unit) => {
    const mark = markOf(unit);
    if (kind.value !== "all" && unit.kind !== kind.value) return false;
    if (filter.value === "undecided" && mark) return false;
    if (filter.value === "flagged" && !unit.flagged) return false;
    if (filter.value === "fix" && (!mark || mark.state !== "fix")) return false;
    if (filter.value === "ok" && (!mark || mark.state !== "ok")) return false;
    return !q || JSON.stringify([unit.item.body, unit.sentences.map((s) => s.body)]).toLowerCase().includes(q);
  });
}

function counts() {
  let ok = 0, fix = 0;
  for (const unit of units) { const mark = markOf(unit); if (mark && mark.state === "ok") ok++; if (mark && mark.state === "fix") fix++; }
  document.getElementById("counts").textContent = units.length + " units · " + ok + " OK · " + fix + " need fixes · " + (units.length - ok - fix) + " undecided";
}

function render() {
  const shown = visible();
  list.innerHTML = shown.length ? shown.map(unitHtml).join("") : '<p class="empty">Nothing here.</p>';
  counts();
}

function setMark(unit, state, note) {
  if (state) marks[unit.id] = { hash: unit.hash, state, note: note || "" };
  else delete marks[unit.id];
  save();
}

list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-act]");
  if (!button) return;
  const article = button.closest("article");
  const unit = units.find((u) => u.id === article.id);
  const current = markOf(unit);
  const state = current && current.state === button.dataset.act ? "" : button.dataset.act;
  setMark(unit, state, article.querySelector("textarea").value);
  article.className = state;
  article.querySelectorAll("button[data-act]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.act === state)));
  counts();
});

list.addEventListener("change", (event) => {
  if (event.target.tagName !== "TEXTAREA") return;
  const article = event.target.closest("article");
  const unit = units.find((u) => u.id === article.id);
  const note = event.target.value.trim();
  const current = markOf(unit);
  if (note) setMark(unit, "fix", note);
  else if (current) setMark(unit, current.state, "");
  render();
});

document.getElementById("okPage").addEventListener("click", () => {
  const shown = visible().filter((unit) => !markOf(unit));
  if (!shown.length) return;
  if (!window.confirm("Mark " + shown.length + " shown undecided units as OK?")) return;
  for (const unit of shown) setMark(unit, "ok", "");
  render();
});

document.getElementById("download").addEventListener("click", () => {
  const approve = [], fix = [];
  for (const unit of units) {
    const mark = markOf(unit);
    if (mark && mark.state === "ok") approve.push(...unit.ids);
    if (mark && mark.state === "fix") fix.push({ id: unit.id, note: mark.note });
  }
  const blob = new Blob([JSON.stringify({ level, approve, fix }, null, 2) + "\\n"], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "review-" + level + ".json";
  link.click();
  URL.revokeObjectURL(link.href);
});

filter.addEventListener("change", render);
kind.addEventListener("change", render);
search.addEventListener("input", render);
render();
`;
