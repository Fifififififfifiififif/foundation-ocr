import { z } from "zod";

const digits = (s: string) => s.replace(/\D/g, "");

/** Suma kontrolna NIP (mod 11). */
export function isValidPolishNip(value: string): boolean {
  const d = digits(value);
  if (!/^\d{10}$/.test(d)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * weights[i]!;
  const mod = sum % 11;
  const ctrl = mod === 10 ? 0 : mod;
  return ctrl === Number(d[9]);
}

/** REGON 9 lub 14 cyfr + suma kontrolna. */
export function isValidPolishRegon(value: string): boolean {
  const d = digits(value);
  if (d.length === 9) {
    const w = [8, 9, 2, 3, 4, 5, 6, 7];
    let s = 0;
    for (let i = 0; i < 8; i++) s += Number(d[i]) * w[i]!;
    const c = s % 11;
    const ctrl = c === 10 ? 0 : c;
    return ctrl === Number(d[8]);
  }
  if (d.length === 14) {
    const w9 = [2, 4, 8, 5, 0, 9, 7, 3];
    let s9 = 0;
    for (let i = 0; i < 8; i++) s9 += Number(d[i]) * w9[i]!;
    const c9 = s9 % 11;
    const ctrl9 = c9 === 10 ? 0 : c9;
    if (ctrl9 !== Number(d[8])) return false;
    const w14 = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];
    let s14 = 0;
    for (let i = 0; i < 13; i++) s14 += Number(d[i]) * w14[i]!;
    const c14 = s14 % 11;
    const ctrl14 = c14 === 10 ? 0 : c14;
    return ctrl14 === Number(d[13]);
  }
  return false;
}

/** KRS — 10 cyfr (z zerami wiodącymi). */
export function normalizeKrs(value: string): string | null {
  const d = digits(value);
  if (d.length === 0 || d.length > 10) return null;
  return d.padStart(10, "0");
}

export function normalizeNip(value: string): string | null {
  const d = digits(value);
  if (d.length !== 10) return null;
  return d;
}

export function normalizeRegon(value: string): string | null {
  const d = digits(value);
  if (d.length !== 9 && d.length !== 14) return null;
  return d;
}

export const krsLookupBodySchema = z
  .object({
    krs: z.string().max(20).optional(),
    nip: z.string().max(20).optional(),
    regon: z.string().max(20).optional(),
    rejestr: z.enum(["P", "S"]).optional(),
  })
  .refine(
    (v) => {
      const k = v.krs?.trim();
      const n = v.nip?.trim();
      const r = v.regon?.trim();
      return Boolean(k || n || r);
    },
    { message: "Podaj numer KRS, NIP lub REGON." },
  );

export function validateLookupIdentifiers(input: {
  krs?: string;
  nip?: string;
  regon?: string;
}): { ok: true; krs?: string; nip?: string; regon?: string } | { ok: false; message: string } {
  const krs = input.krs?.trim() ? normalizeKrs(input.krs) : undefined;
  const nip = input.nip?.trim() ? normalizeNip(input.nip) : undefined;
  const regon = input.regon?.trim() ? normalizeRegon(input.regon) : undefined;

  if (!krs && !nip && !regon) {
    return { ok: false, message: "Podaj poprawny numer KRS (10 cyfr), NIP (10 cyfr) lub REGON (9/14 cyfr)." };
  }
  if (krs && !/^\d{10}$/.test(krs)) {
    return { ok: false, message: "Nieprawidłowy numer KRS." };
  }
  if (nip) {
    if (!isValidPolishNip(nip)) return { ok: false, message: "Nieprawidłowy numer NIP." };
  }
  if (regon && !isValidPolishRegon(regon)) {
    return { ok: false, message: "Nieprawidłowy numer REGON." };
  }
  return {
    ok: true,
    ...(krs ? { krs } : {}),
    ...(nip ? { nip } : {}),
    ...(regon ? { regon } : {}),
  };
}
