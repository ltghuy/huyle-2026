// The demo's "heavy work": a box blur over a photo-sized image, the kind of
// job the course moves to a web worker. One generator does the work in row
// bands and yields after each band, so the same code runs in one go, in
// chunks between which the browser gets a turn, or inside a worker.

export const PHOTO_WIDTH = 1200;
export const PHOTO_HEIGHT = 750;
const RADIUS = 18;
const PASSES = 3;
const BAND_ROWS = 25;

/** A deterministic "photo": sky, sun, two mountain ridges, a little grain. */
export function makePhoto(width = PHOTO_WIDTH, height = PHOTO_HEIGHT) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  let seed = 7;
  const grain = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return (seed / 2147483648 - 0.5) * 24;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const u = x / width;
      const v = y / height;
      const far = 0.62 - 0.12 * Math.sin(u * 7) - 0.06 * Math.sin(u * 17 + 1);
      const near = 0.8 - 0.08 * Math.sin(u * 5 + 2) - 0.04 * Math.sin(u * 23);
      const sun = (u - 0.72) ** 2 + ((v - 0.25) * 0.625) ** 2 < 0.004;
      let r: number, g: number, b: number;
      if (v > near) [r, g, b] = [51, 65, 85];
      else if (v > far) [r, g, b] = [100, 116, 139];
      else if (sun) [r, g, b] = [253, 230, 138];
      else [r, g, b] = [147 + 77 * v, 197 + 45 * v, 253];
      const n = grain();
      pixels[i] = r + n;
      pixels[i + 1] = g + n;
      pixels[i + 2] = b + n;
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}

function blurRows(src: Uint8ClampedArray, dst: Uint8ClampedArray, width: number, height: number, horizontal: boolean, from: number, to: number) {
  const size = 2 * RADIUS + 1;
  for (let y = from; y < to; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let k = -RADIUS; k <= RADIUS; k++) {
        const sx = horizontal ? Math.min(width - 1, Math.max(0, x + k)) : x;
        const sy = horizontal ? y : Math.min(height - 1, Math.max(0, y + k));
        const j = (sy * width + sx) * 4;
        r += src[j];
        g += src[j + 1];
        b += src[j + 2];
      }
      const i = (y * width + x) * 4;
      dst[i] = r / size;
      dst[i + 1] = g / size;
      dst[i + 2] = b / size;
      dst[i + 3] = 255;
    }
  }
}

/** Blurs `pixels` in place, yielding after every band of rows. */
export function* blurInBands(pixels: Uint8ClampedArray, width = PHOTO_WIDTH, height = PHOTO_HEIGHT): Generator<void, void, void> {
  const scratch = new Uint8ClampedArray(pixels.length);
  for (let pass = 0; pass < PASSES; pass++) {
    for (const [src, dst, horizontal] of [
      [pixels, scratch, true],
      [scratch, pixels, false],
    ] as const) {
      for (let from = 0; from < height; from += BAND_ROWS) {
        blurRows(src, dst, width, height, horizontal, from, Math.min(height, from + BAND_ROWS));
        yield;
      }
    }
  }
}

/** Runs the whole blur without giving the browser a turn. */
export function blurAll(pixels: Uint8ClampedArray) {
  for (const _ of blurInBands(pixels)); // eslint-disable-line @typescript-eslint/no-unused-vars
  return pixels;
}

/** A short fingerprint of the image, to show all three modes produce the same pixels. */
export function checksum(pixels: Uint8ClampedArray) {
  let hash = 2166136261;
  for (let i = 0; i < pixels.length; i += 7) hash = Math.imul(hash ^ pixels[i], 16777619) >>> 0;
  return hash.toString(16).padStart(8, "0");
}
