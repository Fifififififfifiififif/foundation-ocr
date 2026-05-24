import { describe, expect, it } from "vitest";

import { assessOcrText } from "./ocr-quality";

describe("assessOcrText", () => {
  it("odrzuca niepoprawny NIP mimo że parser go zwrócił", () => {
    const r = assessOcrText("NIP: 5260250275\nKwota netto: 10,00 PLN", 90);
    expect(r.fields.nip).toBeNull();
    expect(r.manualReviewRequired).toBe(true);
  });
});
