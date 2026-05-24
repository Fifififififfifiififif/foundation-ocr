/** Strukturalny wynik parsowania faktury (OCR → JSON). */

export type InvoiceParty = {
  name: string | null;
  taxId: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
};

export type InvoiceBankDetails = {
  account: string | null;
  iban: string | null;
  swift: string | null;
};

export type InvoiceLineItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  vatRate: number | null;
  netAmount: number | null;
  grossAmount: number | null;
  lineTotal: number | null;
};

export type ParsedInvoice = {
  invoiceNumber: string | null;
  issueDate: Date | null;
  saleDate: Date | null;
  dueDate: Date | null;
  paymentMethod: string | null;
  currency: string | null;
  amounts: {
    net: number | null;
    vat: number | null;
    gross: number | null;
    discount: number | null;
  };
  taxRates: number[];
  seller: InvoiceParty;
  buyer: InvoiceParty;
  bank: InvoiceBankDetails;
  lineItems: InvoiceLineItem[];
  documentType: string | null;
  notes: string | null;
  language: "pl" | "en" | "de" | "fr" | "unknown";
  parsingConfidence: number | null;
  warnings: string[];
};

/** Pola zgodne z istniejącym API aplikacji (Document + formularze). */
export type ParsedDocumentFields = {
  invoiceNumber: string | null;
  issueDate: Date | null;
  paymentDate: Date | null;
  amountNet: number | null;
  vatAmount: number | null;
  amountGross: number | null;
  nip: string | null;
  sellerName: string | null;
  buyerName: string | null;
  documentType: string | null;
  notes: string | null;
  bankAccount: string | null;
};
