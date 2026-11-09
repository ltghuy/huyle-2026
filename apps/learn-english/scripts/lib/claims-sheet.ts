// Builds the owner's claim review page (`pnpm content:claims pull`): one card
// per group of identical claims, with the Vietnamese sentence, the reference
// English, the learner's answer and Claude's suggestion. The owner marks each
// card Approve or Reject (with a Vietnamese explanation for the learner);
// marks live in localStorage, and "Download decisions" saves the file that
// `content:claims apply` reads. Groups decided automatically are listed
// read-only. Learner text is untrusted, so everything is escaped on the server
// and the page's script never writes HTML.
import type { ClaimGroup, ClaimsFile } from "../claims";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapes text for HTML element content and quoted attributes. */
export function escapeHtml(text: string): string {
  return String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

const AUTO_LABELS = { approved: "Already accepted", dropped: "Dropped", rejected: "Rejected" } as const;

function sentenceHtml(group: ClaimGroup): string {
  if (!group.sentence) return `<div class="muted">Sentence ${escapeHtml(group.sentenceId)} is no longer in the course.</div>`;
  return (
    `<div class="vi">${escapeHtml(group.sentence.vi)}</div>` +
    `<div><span class="label">Reference</span> ${escapeHtml(group.sentence.en)}</div>` +
    `<div class="answer"><span class="label">Learner</span> ${escapeHtml(group.answer)}</div>`
  );
}

function headHtml(group: ClaimGroup): string {
  const level = group.sentence ? `<span class="tag">${escapeHtml(group.sentence.level)}</span>` : "";
  const ai = group.aiCount ? `<span class="tag">AI accepted ${group.aiCount}</span>` : "";
  return `<div class="head"><span class="tag">${group.count} claim${group.count === 1 ? "" : "s"}</span>${ai}${level}<span class="muted">${escapeHtml(group.sentenceId)}</span></div>`;
}

function openHtml(group: ClaimGroup): string {
  const s = group.suggestion;
  const suggestion = s
    ? `<div class="ai ${s.verdict}"><b>Claude: ${s.verdict === "approve" ? "approve" : "reject"}</b> · ${escapeHtml(s.noteEn)}<div class="muted">${escapeHtml(s.reasonVi)}</div></div>`
    : `<div class="ai"><b>No suggestion</b>${group.suggestionError ? ` · ${escapeHtml(group.suggestionError)}` : ""}</div>`;
  const prefill = s?.verdict === "reject" ? s.reasonVi : "";
  return (
    `<article data-key="${escapeHtml(group.key)}" data-suggest="${s ? s.verdict : ""}">` +
    headHtml(group) +
    sentenceHtml(group) +
    suggestion +
    `<div class="actions"><button type="button" class="okb" data-act="approve" aria-pressed="false">Approve</button>` +
    `<button type="button" class="badb" data-act="reject" aria-pressed="false">Reject</button>` +
    `<textarea placeholder="Giải thích cho người học (bắt buộc khi từ chối)">${escapeHtml(prefill)}</textarea></div>` +
    `</article>`
  );
}

function autoHtml(group: ClaimGroup): string {
  const auto = group.auto!;
  return (
    `<article class="auto">` +
    headHtml(group) +
    sentenceHtml(group) +
    `<div class="ai"><b>${AUTO_LABELS[auto.status]}</b> · ${escapeHtml(auto.reason)}${auto.explanationVi ? `<div class="muted">${escapeHtml(auto.explanationVi)}</div>` : ""}</div>` +
    `</article>`
  );
}

/** The review page for one pull. */
export function buildClaimsSheet(file: ClaimsFile): string {
  const open = file.groups.filter((group) => !group.auto);
  const auto = file.groups.filter((group) => group.auto);
  const date = escapeHtml(file.date);
  const config = JSON.stringify({ date: file.date }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Claims ${date}</title>
<style>${STYLE}</style>
</head>
<body>
<header>
  <h1>Claims ${date} <span class="muted">(${escapeHtml(file.target)} D1)</span></h1>
  <p id="counts"></p>
  <nav>
    <button id="follow" type="button">Follow Claude on undecided</button>
    <button id="download" type="button" class="primary">Download decisions</button>
  </nav>
</header>
<main>
<h2>For you (${open.length})</h2>
<div id="list">${open.length ? open.map(openHtml).join("") : '<p class="empty">Nothing to decide.</p>'}</div>
<h2>Decided automatically (${auto.length})</h2>
${auto.map(autoHtml).join("")}
</main>
<script type="application/json" id="config">${config}</script>
<script>${SCRIPT}</script>
</body>
</html>
`;
}

const STYLE = `
:root { --bg: #fafaf9; --card: #fff; --fg: #1c1917; --muted: #57534e; --line: #e7e5e4; --ok: #15803d; --bad: #b91c1c; --accent: #1d4ed8; }
@media (prefers-color-scheme: dark) { :root { --bg: #1c1917; --card: #292524; --fg: #f5f5f4; --muted: #a8a29e; --line: #44403c; --ok: #4ade80; --bad: #f87171; --accent: #93c5fd; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; }
header { position: sticky; top: 0; z-index: 1; background: var(--bg); border-bottom: 1px solid var(--line); padding: 12px 16px; }
h1 { margin: 0; font-size: 18px; }
h2 { font-size: 16px; margin: 16px 0 0; }
#counts { margin: 4px 0 8px; color: var(--muted); }
nav { display: flex; flex-wrap: wrap; gap: 8px; }
button, textarea { font: inherit; color: inherit; background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 6px 10px; }
button { cursor: pointer; }
button.primary { background: var(--accent); color: var(--bg); border-color: var(--accent); }
main { max-width: 900px; margin: 0 auto; padding: 0 16px 32px; display: grid; gap: 12px; }
#list { display: grid; gap: 12px; }
article { background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--line); border-radius: 8px; padding: 12px 16px; display: grid; gap: 4px; }
article.approve { border-left-color: var(--ok); }
article.reject { border-left-color: var(--bad); }
article.auto { opacity: 0.8; }
.head { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
.tag { font-size: 12px; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 0 8px; }
.muted, .label { color: var(--muted); }
.label { font-size: 12px; text-transform: uppercase; margin-right: 4px; }
.vi { font-size: 17px; }
.answer { font-size: 17px; }
.ai { margin-top: 6px; padding: 6px 10px; border-radius: 6px; background: color-mix(in srgb, var(--line) 50%, transparent); }
.ai.approve { background: color-mix(in srgb, var(--ok) 14%, transparent); }
.ai.reject { background: color-mix(in srgb, var(--bad) 14%, transparent); }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; align-items: flex-start; }
.actions textarea { flex: 1 1 260px; min-height: 38px; }
.actions button[aria-pressed=true].okb { background: var(--ok); color: var(--bg); border-color: var(--ok); }
.actions button[aria-pressed=true].badb { background: var(--bad); color: var(--bg); border-color: var(--bad); }
.empty { color: var(--muted); }
`;

// Reads keys and text from the DOM (getAttribute decodes the escaping) and
// only ever sets textContent, classes and attributes.
const SCRIPT = `
const { date } = JSON.parse(document.getElementById("config").textContent);
const storeKey = "learn-english-claims:" + date;
let marks = {};
try { marks = JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch {}
const save = () => { try { localStorage.setItem(storeKey, JSON.stringify(marks)); } catch {} };
const cards = [...document.querySelectorAll("article[data-key]")];

function paint(card) {
  const mark = marks[card.dataset.key];
  const state = mark ? mark.state : "";
  card.className = state;
  card.querySelectorAll("button[data-act]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.act === state)));
  if (mark && typeof mark.note === "string") card.querySelector("textarea").value = mark.note;
}

function counts() {
  let approve = 0, reject = 0;
  for (const card of cards) { const mark = marks[card.dataset.key]; if (mark && mark.state === "approve") approve++; if (mark && mark.state === "reject") reject++; }
  document.getElementById("counts").textContent = cards.length + " groups · " + approve + " approve · " + reject + " reject · " + (cards.length - approve - reject) + " undecided";
}

function setMark(card, state) {
  const note = card.querySelector("textarea").value;
  if (state) marks[card.dataset.key] = { state, note };
  else delete marks[card.dataset.key];
  save();
  paint(card);
  counts();
}

document.getElementById("list").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-act]");
  if (!button) return;
  const card = button.closest("article");
  const current = marks[card.dataset.key];
  setMark(card, current && current.state === button.dataset.act ? "" : button.dataset.act);
});

document.getElementById("list").addEventListener("change", (event) => {
  if (event.target.tagName !== "TEXTAREA") return;
  const card = event.target.closest("article");
  const mark = marks[card.dataset.key];
  if (mark) { mark.note = event.target.value; save(); }
});

document.getElementById("follow").addEventListener("click", () => {
  for (const card of cards) {
    if (marks[card.dataset.key] || !card.dataset.suggest) continue;
    setMark(card, card.dataset.suggest);
  }
});

document.getElementById("download").addEventListener("click", () => {
  const approve = [], reject = [], missing = [];
  for (const card of cards) {
    const mark = marks[card.dataset.key];
    if (!mark) continue;
    if (mark.state === "approve") approve.push(card.dataset.key);
    if (mark.state === "reject") {
      const explanationVi = card.querySelector("textarea").value.trim();
      if (!explanationVi) missing.push(card);
      reject.push({ groupKey: card.dataset.key, explanationVi });
    }
  }
  if (missing.length) {
    window.alert(missing.length + " rejected group(s) have no explanation. Write one for the learner first.");
    missing[0].scrollIntoView({ block: "center" });
    return;
  }
  const blob = new Blob([JSON.stringify({ date, approve, reject }, null, 2) + "\\n"], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "claims-decisions-" + date + ".json";
  link.click();
  URL.revokeObjectURL(link.href);
});

cards.forEach(paint);
counts();
`;
