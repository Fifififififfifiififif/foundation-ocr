import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(1, "Podaj nazwę projektu"),
  grantNumber: z.string().min(1, "Podaj numer grantu"),
  fundingSource: z.string().min(1, "Podaj źródło finansowania"),
  budget: z.coerce.number().nonnegative("Budżet nie może być ujemny"),
  description: z
    .string()
    .transform((s) => s.trim() || null)
    .nullable()
    .optional(),
});

export const contractorSchema = z.object({
  name: z.string().min(1, "Podaj nazwę kontrahenta"),
  nip: z
    .string()
    .min(1, "Podaj NIP")
    .transform((s) => s.replace(/\D/g, ""))
    .pipe(z.string().length(10, "NIP musi mieć 10 cyfr")),
  email: z
    .union([z.string().email("Nieprawidłowy adres e-mail"), z.literal("")])
    .optional()
    .transform((v) => v || null),
  phone: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  address: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});

export const documentStatusSchema = z.enum(["draft", "review", "approved"]);

const optionalDate = z.string().transform((v) => {
  const t = v.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
});

const optionalDecimal = z.string().transform((v) => {
  const t = v.trim();
  if (!t) return null;
  const cleaned = t
    .replace(/\s/g, "")
    .replace(/(PLN|zł|zl|ZŁ)/gi, "")
    .replace(/\s/g, "");
  let s = cleaned;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
});

const invoiceCoreFields = {
  invoiceNumber: z
    .string()
    .transform((s) => s.trim() || null)
    .nullable(),
  issueDate: optionalDate,
  paymentDate: optionalDate,
  amountNet: optionalDecimal,
  amountVat: optionalDecimal,
  amountGross: optionalDecimal,
  documentType: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  ocrVendorName: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  ocrContractorNip: z
    .string()
    .optional()
    .transform((v) => {
      const t = (v ?? "").trim().replace(/\D/g, "");
      return t.length === 0 ? null : t;
    })
    .pipe(
      z.union([
        z.null(),
        z
          .string()
          .length(10, "NIP na dokumencie musi mieć dokładnie 10 cyfr (lub pozostaw pole puste)"),
      ]),
    ),
  ocrBankAccount: z
    .string()
    .optional()
    .transform((v) => {
      const t = (v ?? "").trim().replace(/\s/g, "").toUpperCase();
      if (!t) return null;
      /** Niepełny IBAN (np. samo „PL”) — traktuj jako puste, pole jest opcjonalne. */
      if (t.length < 15 || !/^[A-Z]{2}\d{2}/.test(t)) return null;
      return t.length <= 34 ? t : t.slice(0, 34);
    }),
  expenseCategory: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  notes: z
    .string()
    .transform((s) => s.trim() || null)
    .nullable(),
  contractorId: z
    .string()
    .transform((s) => s.trim())
    .superRefine((val, ctx) => {
      if (val.length === 0) return;
      if (!z.string().cuid().safeParse(val).success) {
        ctx.addIssue({
          code: "custom",
          message: "Wybierz kontrahenta z listy lub pozostaw puste.",
        });
      }
    })
    .transform((val) => (val.length === 0 ? null : val)),
  projectId: z
    .string()
    .transform((s) => s.trim())
    .superRefine((val, ctx) => {
      if (val.length === 0) return;
      if (!z.string().cuid().safeParse(val).success) {
        ctx.addIssue({
          code: "custom",
          message: "Wybierz projekt z listy lub pozostaw puste.",
        });
      }
    })
    .transform((val) => (val.length === 0 ? null : val)),
};

const invoiceCoreSchema = z.object(invoiceCoreFields);

export type InvoiceCoreParsed = z.infer<typeof invoiceCoreSchema>;

export function applyInvoiceBusinessRules(
  data: InvoiceCoreParsed & { status?: z.infer<typeof documentStatusSchema> },
  ctx: z.RefinementCtx,
): void {
  const net = data.amountNet;
  const gross = data.amountGross;
  const vat = data.amountVat;

  for (const [label, val, path] of [
    ["Kwota netto", net, "amountNet"],
    ["Kwota VAT", vat, "amountVat"],
    ["Kwota brutto", gross, "amountGross"],
  ] as const) {
    if (val != null && val < 0) {
      ctx.addIssue({
        code: "custom",
        message: `${label} nie może być ujemna`,
        path: [path],
      });
    }
  }

  if (net != null && gross != null && net > gross) {
    ctx.addIssue({
      code: "custom",
      message: "Kwota netto nie może być większa niż kwota brutto",
      path: ["amountNet"],
    });
  }

  if (vat != null && gross != null && gross >= 0 && vat > gross) {
    ctx.addIssue({
      code: "custom",
      message: "Kwota VAT nie może być większa niż kwota brutto",
      path: ["amountVat"],
    });
  }

  if (net != null && vat != null && gross != null) {
    const sum = net + vat;
    if (gross > 0 && Math.abs(sum - gross) > 0.02) {
      ctx.addIssue({
        code: "custom",
        message:
          "Suma netto + VAT musi zgadzać się z brutto (dopuszczalna różnica zaokrągleń 0,02 zł)",
        path: ["amountGross"],
      });
    }
  }

  const issue = data.issueDate;
  const pay = data.paymentDate;
  if (issue && pay && pay < issue) {
    ctx.addIssue({
      code: "custom",
      message: "Data płatności nie może być wcześniejsza niż data wystawienia",
      path: ["paymentDate"],
    });
  }
}

export const documentVerifyFieldsSchema =
  invoiceCoreSchema.superRefine(applyInvoiceBusinessRules);

export const documentFormSchema = invoiceCoreSchema
  .extend({
    status: documentStatusSchema,
  })
  .superRefine(applyInvoiceBusinessRules);

export type ProjectInput = z.infer<typeof projectSchema>;
export type ContractorInput = z.infer<typeof contractorSchema>;
export type DocumentFormInput = z.infer<typeof documentFormSchema>;
export type DocumentVerifyFieldsInput = z.infer<typeof documentVerifyFieldsSchema>;
