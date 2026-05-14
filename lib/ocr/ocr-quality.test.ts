import { describe, expect, it } from "vitest";

import { assessParsedInvoice } from "./ocr-quality";
import { parseInvoiceFromText } from "./parser";

describe("assessParsedInvoice", () => {
  it("przy bardzo niskiej pewności czyści pola", () => {
    const raw = parseInvoiceFromText(`
Faktura VAT nr FV/1
NIP: 5260250274
Razem brutto: 100,00 PLN
`);
    const r = assessParsedInvoice(raw, "x".repeat(200), 40);
    expect(r.manualReviewRequired).toBe(true);
    expect(r.fields.invoiceNumber).toBeNull();
    expect(r.fields.amountGross).toBeNull();
  });

  it("odrzuca niepoprawny NIP mimo że parser go zwrócił", () => {
    const raw = parseInvoiceFromText("NIP: 5260250275\nKwota netto: 10,00 PLN");
    const r = assessParsedInvoice(raw, "NIP: 5260250275\nKwota netto: 10,00 PLN", 90);
    expect(r.fields.nip).toBeNull();
    expect(r.manualReviewRequired).toBe(true);
  });
});
