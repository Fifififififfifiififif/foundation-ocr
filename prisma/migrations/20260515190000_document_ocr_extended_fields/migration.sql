-- Rozszerzone pola OCR / parsowania faktury na document

ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrBuyerName" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrBuyerNip" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrSellerAddress" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrSellerEmail" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrSellerPhone" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrSwift" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrCurrency" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrSaleDate" TIMESTAMP(3);
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrDueDate" TIMESTAMP(3);
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrPaymentMethod" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrLanguage" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrParsingConfidence" INTEGER;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ocrParsedJson" JSONB;
