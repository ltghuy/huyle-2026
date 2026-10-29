// Certificates for finished progress rows (feature 009). The certificate is
// drawn on a canvas in the browser, so what the learner sees and the PNG they
// save are the same image, made offline. The image is in English; the dialog
// around it and its alt text stay in Vietnamese.
import type { Level } from "@/learning/types";
import type { ProgressKind } from "./progress-math";

export interface CertificateData {
  kind: ProgressKind;
  level: Level;
  /** Items in the row, all learned. */
  total: number;
  /** "Bạn" when the learner has no name. */
  name: string;
  /** Local "YYYY-MM-DD" the last item was learned. */
  date: string;
}

const KIND_TEXT: Record<ProgressKind, { what: string; title: string; slug: string }> = {
  word: { what: "từ vựng", title: "từ vựng", slug: "tu-vung" },
  grammar: { what: "chủ điểm ngữ pháp", title: "ngữ pháp", slug: "ngu-phap" },
  forms: { what: "động từ bất quy tắc", title: "động từ bất quy tắc", slug: "dong-tu-bat-quy-tac" },
};

const count = (n: number) => n.toLocaleString("vi-VN");

/** "1.164 từ vựng trình độ A1" (AC-004). */
export function achievementText(kind: ProgressKind, level: Level, total: number): string {
  return `${count(total)} ${KIND_TEXT[kind].what} trình độ ${level}`;
}

/** "từ vựng A1", for labels. */
export function certificateTitle(kind: ProgressKind, level: Level): string {
  return `${KIND_TEXT[kind].title} ${level}`;
}

/** "chung-nhan-dong-tu-bat-quy-tac-C1.png" (AC-006). */
export function certificateFileName(kind: ProgressKind, level: Level): string {
  return `chung-nhan-${KIND_TEXT[kind].slug}-${level}.png`;
}

const KIND_ENGLISH: Record<ProgressKind, string> = { word: "word", grammar: "grammar topic", forms: "irregular verb" };

/** "1,164 words at level A1", the achievement on the English certificate image. */
export function englishAchievementText(kind: ProgressKind, level: Level, total: number): string {
  return `${total.toLocaleString("en-US")} ${KIND_ENGLISH[kind]}${total === 1 ? "" : "s"} at level ${level}`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10-28" → "October 28, 2026". */
export function englishDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** "2026-10-28" → "ngày 28 tháng 10 năm 2026". */
export function vietnameseDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `ngày ${d} tháng ${m} năm ${y}`;
}

/** What the certificate says, for screen readers and the image's alt text. */
export function certificateSummary(data: CertificateData): string {
  return `Chứng nhận ${data.name} đã học xong ${achievementText(data.kind, data.level, data.total)}, ${vietnameseDate(data.date)}, English with Evan.`;
}

export const CERTIFICATE_WIDTH = 1600;
export const CERTIFICATE_HEIGHT = 1130;

// A light "paper" in both themes, so it reads as a certificate and prints well.
const PAPER = "#fbf8f1";
const INK = "#1f1b2e";
const MUTED = "#6b6478";
const ACCENT = "#4f46e5";
const GOLD = "#b8892a";

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, font: string, color: string, spacing = 0) {
  ctx.font = font;
  ctx.fillStyle = color;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(value, x, y);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

/** The largest font size up to `max` at which `value` fits in `width`. */
function fitSize(ctx: CanvasRenderingContext2D, value: string, weight: number, family: string, max: number, width: number): number {
  let size = max;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 28 && ctx.measureText(value).width > width) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Draws the certificate on `canvas` in the page's font, once that font has loaded. */
export async function drawCertificate(canvas: HTMLCanvasElement, data: CertificateData): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available");
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  await Promise.all([400, 600, 700].map((weight) => document.fonts?.load(`${weight} 32px ${family}`, data.name)));

  const W = CERTIFICATE_WIDTH;
  const H = CERTIFICATE_HEIGHT;
  const cx = W / 2;
  canvas.width = W;
  canvas.height = H;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 64, W - 128, H - 128);

  text(ctx, "ENGLISH WITH EVAN", cx, 180, `600 28px ${family}`, ACCENT, 6);
  text(ctx, "CERTIFICATE", cx, 300, `700 96px ${family}`, INK, 4);
  text(ctx, "OF COMPLETION", cx, 356, `600 30px ${family}`, GOLD, 10);

  text(ctx, "This certifies that", cx, 460, `400 32px ${family}`, MUTED);
  const nameSize = fitSize(ctx, data.name, 700, family, 88, W - 360);
  text(ctx, data.name, cx, 565, `700 ${nameSize}px ${family}`, INK);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 420, 605);
  ctx.lineTo(cx + 420, 605);
  ctx.stroke();

  text(ctx, "has completed", cx, 675, `400 32px ${family}`, MUTED);
  const achievement = englishAchievementText(data.kind, data.level, data.total);
  const achievementSize = fitSize(ctx, achievement, 600, family, 48, W - 360);
  text(ctx, achievement, cx, 745, `600 ${achievementSize}px ${family}`, INK);

  // Seal with the level.
  const sealY = 905;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(cx, sealY, 96, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, sealY, 80, 0, Math.PI * 2);
  ctx.stroke();
  text(ctx, "LEVEL", cx, sealY - 28, `600 18px ${family}`, PAPER, 3);
  text(ctx, data.level, cx, sealY + 36, `700 64px ${family}`, PAPER);

  // Date on the left, issuer on the right.
  for (const [x, label, value] of [
    [340, "Date", englishDate(data.date)],
    [W - 340, "Issued by", "english.huyle.work"],
  ] as const) {
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 190, 920);
    ctx.lineTo(x + 190, 920);
    ctx.stroke();
    text(ctx, value, x, 905, `600 30px ${family}`, INK);
    text(ctx, label, x, 960, `400 24px ${family}`, MUTED);
  }
}

/** The drawn certificate as a PNG. */
export async function certificatePng(data: CertificateData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await drawCertificate(canvas, data);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))), "image/png"));
}
