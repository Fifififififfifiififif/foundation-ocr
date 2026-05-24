export type KsefEnvironment = "test" | "prod";

export type KsefInvoiceDirection = "received" | "issued";

export type KsefSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  sessionReference?: string;
};

export type KsefInvoiceListItem = {
  ksefReference: string;
  invoiceNumber: string | null;
  issueDate: string | null;
  sellerName: string | null;
  sellerNip: string | null;
  buyerName: string | null;
  buyerNip: string | null;
  amountNet: number | null;
  amountVat: number | null;
  amountGross: number | null;
  status: string | null;
  rawXml?: string | null;
};

export type KsefImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export type KsefConnectionTestResult = {
  ok: boolean;
  message: string;
  environment: KsefEnvironment;
};
