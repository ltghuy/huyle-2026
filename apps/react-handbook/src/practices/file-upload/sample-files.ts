import { MB } from "@/server/practices/file-upload/upload.schema";

// Demo files generated in the browser: a mix that uploads and a few that the
// rules reject.

async function samplePng() {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 200;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 320, 200);
  gradient.addColorStop(0, "#6366f1");
  gradient.addColorStop(1, "#22c55e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 320, 200);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("Sample image", 70, 110);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  return new File([blob], "sample-image.png", { type: "image/png" });
}

function randomBytes(size: number) {
  const bytes = new Uint8Array(size);
  // getRandomValues is limited to 64 KB per call.
  for (let i = 0; i < size; i += 65536) crypto.getRandomValues(bytes.subarray(i, Math.min(i + 65536, size)));
  return bytes;
}

export async function sampleFiles(): Promise<File[]> {
  const rows = ["id,name,score", ...Array.from({ length: 2000 }, (_, i) => `${i + 1},user-${i + 1},${(i * 37) % 100}`)];
  return [
    await samplePng(),
    new File([rows.join("\n")], "scores.csv", { type: "text/csv" }),
    new File([JSON.stringify({ practice: "file-upload", items: rows.slice(1, 200) }, null, 2)], "data.json", { type: "application/json" }),
    new File([randomBytes(20 * MB)], "archive.zip", { type: "application/zip" }),
    new File([], "empty.txt", { type: "text/plain" }),
    new File(["MZ"], "setup.exe", { type: "application/x-msdownload" }),
  ];
}
