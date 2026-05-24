import sharp from "sharp";

import { computeOtsuThreshold } from "@/lib/ocr/otsu";

export type PreprocessProfileId =
  | "standard"
  | "high_contrast"
  | "otsu"
  | "adaptive_threshold"
  | "heavy_upscale"
  | "denoise"
  | "sharpen"
  | "flat_grayscale"
  | "trim_borders";

export type PreprocessProfile = {
  id: PreprocessProfileId;
  label: string;
};

export const PREPROCESS_PROFILES: PreprocessProfile[] = [
  { id: "standard", label: "Standard" },
  { id: "high_contrast", label: "High contrast" },
  { id: "otsu", label: "Otsu threshold" },
  { id: "adaptive_threshold", label: "Adaptive threshold" },
  { id: "heavy_upscale", label: "Heavy upscale" },
  { id: "denoise", label: "Denoise" },
  { id: "sharpen", label: "Sharpen" },
  { id: "flat_grayscale", label: "Grayscale only" },
  { id: "trim_borders", label: "Trim borders" },
];

const MIN_WIDTH = 1200;
const MAX_WIDTH = 3200;
const TARGET_UPSCALE = 2400;
const HEAVY_UPSCALE = 2800;

export type ImageMeta = {
  width: number;
  height: number;
};

export async function readImageMeta(buffer: Buffer): Promise<ImageMeta> {
  const meta = await sharp(buffer, { failOn: "none" }).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width <= 0 || height <= 0) {
    throw new Error("Nie można odczytać wymiarów obrazu.");
  }
  return { width, height };
}

function basePipeline(buffer: Buffer) {
  return sharp(buffer, { failOn: "none" }).rotate();
}

async function scaleToTarget(
  pipeline: sharp.Sharp,
  width: number,
  targetMax: number,
  minWidth: number,
): Promise<sharp.Sharp> {
  if (width > MAX_WIDTH) {
    return pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }
  if (width < minWidth) {
    const target = Math.min(targetMax, Math.round(width * 1.85));
    return pipeline.resize({ width: target, withoutEnlargement: false });
  }
  return pipeline;
}

async function applyOtsu(grayscalePng: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(grayscalePng)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const threshold = computeOtsuThreshold(data);
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .threshold(threshold)
    .png({ compressionLevel: 6 })
    .toBuffer();
}

/** Profile dla multi-pass OCR — każdy zwraca PNG. */
export async function renderPreprocessProfile(
  buffer: Buffer,
  profileId: PreprocessProfileId,
): Promise<Buffer> {
  if (!buffer?.length) throw new Error("Brak pliku.");

  try {
    const meta = await readImageMeta(buffer);
    const { width } = meta;

    switch (profileId) {
      case "flat_grayscale": {
        const p = await scaleToTarget(basePipeline(buffer), width, TARGET_UPSCALE, MIN_WIDTH);
        return p.grayscale().png({ compressionLevel: 6 }).toBuffer();
      }
      case "heavy_upscale": {
        const p = basePipeline(buffer);
        const target = width < HEAVY_UPSCALE ? HEAVY_UPSCALE : Math.min(width, MAX_WIDTH);
        return p
          .resize({ width: target, withoutEnlargement: false })
          .grayscale()
          .normalize()
          .sharpen({ sigma: 1.1 })
          .png({ compressionLevel: 6 })
          .toBuffer();
      }
      case "high_contrast": {
        const p = await scaleToTarget(basePipeline(buffer), width, TARGET_UPSCALE, MIN_WIDTH);
        return p
          .grayscale()
          .normalize()
          .linear(1.35, -(128 * 0.25))
          .sharpen({ sigma: 0.9 })
          .png({ compressionLevel: 6 })
          .toBuffer();
      }
      case "denoise": {
        const p = await scaleToTarget(basePipeline(buffer), width, TARGET_UPSCALE, MIN_WIDTH);
        return p
          .grayscale()
          .median(3)
          .normalize()
          .sharpen({ sigma: 0.6 })
          .png({ compressionLevel: 6 })
          .toBuffer();
      }
      case "sharpen": {
        const p = await scaleToTarget(basePipeline(buffer), width, TARGET_UPSCALE, MIN_WIDTH);
        return p
          .grayscale()
          .normalize()
          .sharpen({ sigma: 1.6, m1: 1.2, m2: 0.4 })
          .png({ compressionLevel: 6 })
          .toBuffer();
      }
      case "trim_borders": {
        const p = await scaleToTarget(basePipeline(buffer), width, TARGET_UPSCALE, MIN_WIDTH);
        return p
          .trim({ threshold: 12 })
          .grayscale()
          .normalize()
          .sharpen({ sigma: 0.7 })
          .png({ compressionLevel: 6 })
          .toBuffer();
      }
      case "adaptive_threshold": {
        const scaled = await (
          await scaleToTarget(basePipeline(buffer), width, TARGET_UPSCALE, MIN_WIDTH)
        )
          .grayscale()
          .normalize()
          .png()
          .toBuffer();
        const { data, info } = await sharp(scaled).raw().toBuffer({ resolveWithObject: true });
        const w = info.width;
        const h = info.height;
        const ch = info.channels;
        const out = Buffer.alloc(w * h);
        const block = 31;
        const half = Math.floor(block / 2);
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            let sum = 0;
            let count = 0;
            for (let dy = -half; dy <= half; dy += 1) {
              const yy = y + dy;
              if (yy < 0 || yy >= h) continue;
              for (let dx = -half; dx <= half; dx += 1) {
                const xx = x + dx;
                if (xx < 0 || xx >= w) continue;
                sum += data[(yy * w + xx) * ch]!;
                count += 1;
              }
            }
            const mean = sum / count;
            const idx = y * w + x;
            const pixel = data[idx * ch]!;
            out[idx] = pixel < mean * 0.92 ? 0 : 255;
          }
        }
        return sharp(out, { raw: { width: w, height: h, channels: 1 } })
          .png({ compressionLevel: 6 })
          .toBuffer();
      }
      case "otsu": {
        const gray = await (
          await scaleToTarget(basePipeline(buffer), width, TARGET_UPSCALE, MIN_WIDTH)
        )
          .grayscale()
          .normalize()
          .png()
          .toBuffer();
        return applyOtsu(gray);
      }
      case "standard":
      default: {
        const p = await scaleToTarget(basePipeline(buffer), width, TARGET_UPSCALE, MIN_WIDTH);
        return p
          .grayscale()
          .normalize()
          .sharpen({ sigma: 0.8 })
          .png({ compressionLevel: 6 })
          .toBuffer();
      }
    }
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    if (/input buffer|unsupported image|VipsJpeg/i.test(detail)) {
      throw new Error("Uszkodzony lub nieobsługiwany obraz — użyj JPG albo PNG.");
    }
    throw new Error(`Błąd przygotowania obrazu (${profileId}): ${detail}`);
  }
}

/** Profile używane w multi-pass (kolejność = priorytet przy równym wyniku). */
export function profilesForDocumentClass(
  docClass: import("@/lib/ocr/document-classify").DocumentClass,
): PreprocessProfileId[] {
  const base: PreprocessProfileId[] = [
    "standard",
    "high_contrast",
    "otsu",
    "heavy_upscale",
    "denoise",
    "sharpen",
    "adaptive_threshold",
    "flat_grayscale",
  ];
  if (docClass === "receipt") {
    return ["standard", "high_contrast", "heavy_upscale", "sharpen", "otsu", "denoise"];
  }
  if (docClass === "form" || docClass === "generic_text") {
    return ["standard", "flat_grayscale", "high_contrast", "denoise", "otsu"];
  }
  return [...base, "trim_borders"];
}
