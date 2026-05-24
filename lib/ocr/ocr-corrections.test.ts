import { describe, expect, it } from "vitest";

import { repairOcrText } from "./ocr-corrections";

describe("repairOcrText", () => {
  it("koryguje O→0 w NIP", () => {
    const t = repairOcrText("NIP: 526O25O274");
    expect(t).toContain("526-025-02-74");
  });

  it("usuwa końcowe = z numeru faktury", () => {
    const t = repairOcrText("nr: 4/2O21 =");
    expect(t).toMatch(/nr:\s*4\/2021/);
    expect(t.trim()).toBe("nr: 4/2021");
  });

  it("naprawia kwoty przy etykiecie Razem", () => {
    const t = repairOcrText("Razem: 1 518,7O PLN");
    expect(t).toContain("518,70");
  });
});
