import { describe, expect, it } from "vitest";

import { pickBestOcrCandidate, scoreOcrCandidate } from "./ocr-score";

describe("scoreOcrCandidate", () => {
  it("preferuje tekst z numerem faktury i kwotą", () => {
    const good = `
FAKTURA VAT nr FV/2024/11/15
NIP: 526-025-02-74
Wartość netto: 1 234,56 PLN
Podatek VAT: 284,15 PLN
Do zapłaty: 1 518,71 PLN
`;
    const bad = "skan nieczytelny xxx";
    const goodScore = scoreOcrCandidate(good, 72, "pass-a", "invoice");
    const badScore = scoreOcrCandidate(bad, 90, "pass-b", "invoice");
    expect(goodScore.total).toBeGreaterThan(badScore.total);
  });

  it("pickBestOcrCandidate wybiera lepszy wynik", () => {
    const a = { text: "noise", confidence: 95, passLabel: "a" };
    const b = {
      text: "FAKTURA VAT\nNIP: 5260250274\nDo zapłaty: 100,00 PLN",
      confidence: 60,
      passLabel: "b",
    };
    const best = pickBestOcrCandidate([a, b], "invoice");
    expect(best.passLabel).toBe("b");
  });
});
