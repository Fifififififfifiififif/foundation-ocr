import { z } from "zod";

export const ksefConnectSchema = z.object({
  environment: z.enum(["test", "prod"]).default("test"),
  nip: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "NIP musi mieć 10 cyfr.")
    .optional()
    .or(z.literal("")),
  token: z.string().trim().min(8, "Token KSeF jest wymagany."),
});

export const ksefImportSchema = z.object({
  direction: z.enum(["received", "issued"]),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  ksefReference: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export function normalizeKsefNip(nip: string): string {
  return nip.replace(/\D/g, "").padStart(10, "0").slice(-10);
}
