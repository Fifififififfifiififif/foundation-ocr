import { describe, expect, it } from "vitest";

import { parseInvoiceFromText } from "./parser";

describe("parseInvoiceFromText", () => {
  it("zwraca puste pola dla pustego tekstu", () => {
    const r = parseInvoiceFromText("   \n\t  ");
    expect(r.invoiceNumber).toBeNull();
    expect(r.documentType).toBeNull();
    expect(r.amountGross).toBeNull();
    expect(r.notes).toBeNull();
    expect(r.buyerName).toBeNull();
    expect(r.bankAccount).toBeNull();
  });

  it("parsuje typową fakturę VAT (PL)", () => {
    const text = `
FAKTURA VAT nr FV/2024/11/15
Sprzedawca: ACME Sp. z o.o.
Data wystawienia: 15.11.2024
Termin płatności: 29.11.2024
NIP: 526-025-02-74
Nr konta: PL61 1090 1014 0000 0712 1981 2874
Wartość netto: 1 234,56 PLN
Podatek VAT: 284,15 PLN
Do zapłaty: 1 518,71 PLN
`;
    const r = parseInvoiceFromText(text);
    expect(r.documentType).toBe("Faktura VAT");
    expect(r.invoiceNumber).toBe("FV/2024/11/15");
    expect(r.nip).toBe("5260250274");
    expect(r.bankAccount).toBe("PL61109010140000071219812874");
    expect(r.sellerName).toBe("ACME Sp. z o.o.");
    expect(r.issueDate?.toISOString().slice(0, 10)).toBe("2024-11-15");
    expect(r.paymentDate?.toISOString().slice(0, 10)).toBe("2024-11-29");
    expect(r.amountNet).toBeCloseTo(1234.56, 2);
    expect(r.vatAmount).toBeCloseTo(284.15, 2);
    expect(r.amountGross).toBeCloseTo(1518.71, 2);
  });

  it("parsuje kwotę w formacie 1.234,56 zł", () => {
    const text = `
Faktura VAT
Data wystawienia: 01.01.2025
Kwota netto 1.234,56 zł
VAT 284,15 zł
Razem brutto 1.518,71 zł
`;
    const r = parseInvoiceFromText(text);
    expect(r.amountNet).toBeCloseTo(1234.56, 2);
    expect(r.amountGross).toBeCloseTo(1518.71, 2);
  });

  it("rozpoznaje fakturę korygującą", () => {
    const text = `
Faktura korygująca nr KOR/01/2025
Data wystawienia: 2025-01-10
NIP 1234567890
Razem brutto: 100,00 PLN
`;
    const r = parseInvoiceFromText(text);
    expect(r.documentType).toBe("Faktura korygująca");
    expect(r.nip).toBe("1234567890");
    expect(r.amountGross).toBe(100);
  });

  it("rozpoznaje paragon fiskalny", () => {
    const text = `Paragon fiskalny nr 1234
Data sprzedaży: 03.05.2025
Do zapłaty: 1 299,99 PLN
`;
    const r = parseInvoiceFromText(text);
    expect(r.documentType).toBe("Paragon fiskalny");
    expect(r.issueDate?.toISOString().slice(0, 10)).toBe("2025-05-03");
    expect(r.amountGross).toBeCloseTo(1299.99, 2);
  });

  it("rozpoznaje rachunek bez słowa faktura w nagłówku", () => {
    const text = `Rachunek nr R/2025/88
Data wystawienia: 01.02.2025
NIP: 9876543210
Razem: 500,00 PLN`;
    const r = parseInvoiceFromText(text);
    expect(r.documentType).toBe("Rachunek");
    expect(r.invoiceNumber).toMatch(/R\/2025\/88/i);
    expect(r.nip).toBe("9876543210");
  });

  it("parsuje datę ISO przy etykiecie daty wystawienia", () => {
    const text = `Faktura VAT
Data wystawienia: 2025-12-01
Brutto: 10,00 PLN`;
    const r = parseInvoiceFromText(text);
    expect(r.issueDate?.toISOString().slice(0, 10)).toBe("2025-12-01");
  });
});
