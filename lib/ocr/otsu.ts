/** Otsu threshold na histogramie 8-bit grayscale. */

export function computeOtsuThreshold(pixels: Uint8Array | Buffer): number {
  const hist = new Array<number>(256).fill(0);
  const len = pixels.length;
  for (let i = 0; i < len; i += 1) {
    hist[pixels[i]!]! += 1;
  }

  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * hist[i]!;

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVar = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t += 1) {
    wB += hist[t]!;
    if (wB === 0) continue;
    wF = len - wB;
    if (wF === 0) break;

    sumB += t * hist[t]!;
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }

  return threshold;
}
