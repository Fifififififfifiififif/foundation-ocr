import type { Prisma } from "@/generated/prisma";
import type { OcrQualityAssessment } from "@/lib/ocr/ocr-quality";
import { serializeParsedInvoice } from "@/lib/ocr/legacy-fields";

type OcrDocumentFields = {
  ocrRawText: string | null;
  ocrMeanConfidence: number | null;
  ocrParsingConfidence: number | null;
  ocrManualReviewRecommended: boolean;
  ocrQualityReasons?: string[];
  ocrParsedJson: Prisma.InputJsonValue;
  invoiceNumber: string | null;
  issueDate: Date | null;
  paymentDate: Date | null;
  amountNet: number | null;
  amountVat: number | null;
  amountGross: number | null;
  documentType: string | null;
  ocrVendorName: string | null;
  ocrContractorNip: string | null;
  ocrBankAccount: string | null;
  ocrBuyerName: string | null;
  ocrBuyerNip: string | null;
  ocrSellerAddress: string | null;
  ocrSellerEmail: string | null;
  ocrSellerPhone: string | null;
  ocrSwift: string | null;
  ocrCurrency: string | null;
  ocrSaleDate: Date | null;
  ocrDueDate: Date | null;
  ocrPaymentMethod: string | null;
  ocrLanguage: string | null;
  notes: string | null;
};

/** Pola Prisma `Document` z wyniku OCR (create / update). */
export function documentDataFromOcrAssessment(
  assessed: OcrQualityAssessment,
  extras: {
    ocrRawText: string | null;
    ocrMeanConfidence: number | null;
    ocrQualityReasons: string[];
    filePath?: string;
    fileName?: string;
    mimeType?: string;
  },
): OcrDocumentFields {
  const f = assessed.fields;
  const p = assessed.parsed;

  const row: OcrDocumentFields = {
    ocrRawText: extras.ocrRawText,
    ocrMeanConfidence: extras.ocrMeanConfidence != null ? Math.round(extras.ocrMeanConfidence) : null,
    ocrParsingConfidence: p.parsingConfidence != null ? Math.round(p.parsingConfidence) : null,
    ocrManualReviewRecommended: assessed.manualReviewRequired,
    ocrQualityReasons: extras.ocrQualityReasons.length ? extras.ocrQualityReasons : undefined,
    ocrParsedJson: serializeParsedInvoice(p) as Prisma.InputJsonValue,
    invoiceNumber: f.invoiceNumber,
    issueDate: f.issueDate,
    paymentDate: f.paymentDate,
    amountNet: f.amountNet,
    amountVat: f.vatAmount,
    amountGross: f.amountGross,
    documentType: f.documentType,
    ocrVendorName: f.sellerName,
    ocrContractorNip: f.nip,
    ocrBankAccount: f.bankAccount,
    ocrBuyerName: p.buyer.name,
    ocrBuyerNip: p.buyer.taxId,
    ocrSellerAddress: p.seller.address,
    ocrSellerEmail: p.seller.email,
    ocrSellerPhone: p.seller.phone,
    ocrSwift: p.bank.swift,
    ocrCurrency: p.currency,
    ocrSaleDate: p.saleDate,
    ocrDueDate: p.dueDate,
    ocrPaymentMethod: p.paymentMethod,
    ocrLanguage: p.language,
    notes: f.notes,
  };
  return row;
}
