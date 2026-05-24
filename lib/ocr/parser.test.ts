import { describe, expect, it } from "vitest";

import { extractPartiesFromColumns } from "./extract-utils";
import { normalizeOcrText } from "./normalize-text";
import { assessOcrText } from "./ocr-quality";
import { parseInvoiceFromText, parseInvoiceFull } from "./parser";

describe("parseInvoiceFromText", () => {
  it("zwraca puste pola dla pustego tekstu", () => {
    const r = parseInvoiceFromText("   \n\t  ");
    expect(r.invoiceNumber).toBeNull();
    expect(r.documentType).toBeNull();
    expect(r.amountGross).toBeNull();
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
    expect(r.issueDate?.toISOString().slice(0, 10)).toBe("2024-11-15");
    expect(r.paymentDate?.toISOString().slice(0, 10)).toBe("2024-11-29");
    expect(r.amountNet).toBeCloseTo(1234.56, 2);
    expect(r.vatAmount).toBeCloseTo(284.15, 2);
    expect(r.amountGross).toBeCloseTo(1518.71, 2);
  });

  it("parsuje fakturę angielską", () => {
    const text = `
INVOICE
Invoice Number: INV-2024-0099
Issue Date: 2024-06-01
Due Date: 2024-06-15
Seller: Global Supplies Ltd
Buyer: Foundation OCR
VAT ID: GB123456789
Subtotal: 1,000.00 EUR
VAT Amount: 230.00 EUR
Total Due: 1,230.00 EUR
IBAN: DE89370400440532013000
SWIFT: COBADEFFXXX
`;
    const full = parseInvoiceFull(text, 85);
    expect(full.language).toBe("en");
    expect(full.invoiceNumber).toBe("INV-2024-0099");
    expect(full.amounts.net).toBeCloseTo(1000, 0);
    expect(full.amounts.gross).toBeCloseTo(1230, 0);
    expect(full.bank.iban).toMatch(/^DE/);
    expect(full.bank.swift).toBeTruthy();
  });

  it("NIP na dokumencie to sprzedawca, nawet gdy nabywca jest wcześniej w tekście OCR", () => {
    const text = `
Faktura nr FV/1/2021
Nabywca: Fundacja Demo
NIP: 5955555555
Sprzedawca: Rafsoft Sp. z o.o.
NIP: 8711600535
`;
    const r = parseInvoiceFromText(text);
    expect(r.nip).toBe("8711600535");
    expect(r.notes).toContain("5955555555");
  });

  it("extractPartiesFromColumns: NIP w wierszu kolumnowym", () => {
    const text = `
Sprzedawca Nabywca
Rafsoft Sp. z o.o. Fundacja Demo
NIP 8711600535 NIP 5955555555
`;
    const cols = extractPartiesFromColumns(text);
    expect(cols?.seller.taxId).toBe("8711600535");
    expect(cols?.buyer.taxId).toBe("5955555555");
  });

  it("parsuje fakturę z kolumnami Sprzedawca/Nabywca i nr: 4/2021", () => {
    const text = `
Faktura
nr: 4/2021
Wystawiona w dniu: 07-03-2021, Warszawa
Sprzedawca Nabywca
Rafsoft Sp. z o.o. Fundacja Demo
ul. Strzelińska 2c/10 ul. Przykładowa 1
NIP 8711600535 NIP 5955555555
Razem do zaplaty: 1 991,37 zł
`;
    const normalized = normalizeOcrText(text);
    const cols = extractPartiesFromColumns(normalized);
    expect(cols?.seller.taxId).toBe("8711600535");

    const full = parseInvoiceFull(text, 72);
    expect(full.invoiceNumber).toBe("4/2021");
    expect(full.seller.name).toMatch(/Rafsoft/i);
    expect(full.buyer.name).toMatch(/Fundacja/i);
    expect(full.seller.taxId).toBe("8711600535");
    expect(full.buyer.taxId).toBe("5955555555");
    expect(full.amounts.gross).toBeCloseTo(1991.37, 2);
  });

  it("parsuje Rechnung (DE)", () => {
    const text = `
Rechnung
Rechnungsnummer: RE-55/2025
Rechnungsdatum: 10.01.2025
Netto Summe: 500,00 EUR
MwSt: 95,00 EUR
Gesamtbetrag: 595,00 EUR
`;
    const full = parseInvoiceFull(text);
    expect(full.language).toBe("de");
    expect(full.invoiceNumber).toMatch(/RE-55/);
    expect(full.amounts.gross).toBeCloseTo(595, 0);
  });
});

describe("assessOcrText", () => {
  it("przy bardzo niskiej pewności OCR czyści pola", () => {
    const text = `
Faktura VAT nr FV/1
NIP: 5260250274
Razem brutto: 100,00 PLN
`.repeat(10);
    const r = assessOcrText(text, 40);
    expect(r.manualReviewRequired).toBe(true);
    expect(r.fields.invoiceNumber).toBeNull();
    expect(r.parsed).toBeDefined();
  });
});
