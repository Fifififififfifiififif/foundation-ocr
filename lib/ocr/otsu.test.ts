import { describe, expect, it } from "vitest";

import { computeOtsuThreshold } from "./otsu";

describe("computeOtsuThreshold", () => {
  it("zwraca próg między 0 a 255", () => {
    const pixels = new Uint8Array(400);
    for (let i = 0; i < 200; i += 1) pixels[i] = 40;
    for (let i = 200; i < 400; i += 1) pixels[i] = 220;
    const t = computeOtsuThreshold(pixels);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(255);
  });
});
