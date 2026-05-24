import type { KrsRejestr, MfSubject } from "@/src/modules/krs/types";
import { normalizeKrs } from "@/src/modules/krs/validation";

const DEFAULT_KRS_API_BASE = "https://api-krs.ms.gov.pl";
const DEFAULT_MF_API_BASE = "https://wl-api.mf.gov.pl";
const DEFAULT_TIMEOUT_MS = 12_000;

function krsApiBase(): string {
  return (process.env.KRS_API_BASE_URL ?? DEFAULT_KRS_API_BASE).replace(/\/$/, "");
}

function mfApiBase(): string {
  return (process.env.MF_WL_API_BASE_URL ?? DEFAULT_MF_API_BASE).replace(/\/$/, "");
}

function timeoutMs(): number {
  const n = Number(process.env.KRS_API_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 30_000) : DEFAULT_TIMEOUT_MS;
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T; status: number } | { ok: false; status: number; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    if (res.status === 404) {
      return { ok: false, status: 404, message: "Nie znaleziono podmiotu w rejestrze." };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: `Błąd usługi rejestrowej (HTTP ${res.status}).`,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data, status: res.status };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      status: aborted ? 408 : 502,
      message: aborted
        ? "Przekroczono czas oczekiwania na odpowiedź rejestru."
        : "Nie udało się połączyć z rejestrem. Spróbuj ponownie za chwilę.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Oficjalne API KRS MS — odpis aktualny (ścieżka `odpisaktualny` wg dokumentacji MS). */
export async function fetchKrsOdpisAktualny(
  krs: string,
  rejestr: KrsRejestr = "P",
): Promise<
  | { ok: true; payload: unknown }
  | { ok: false; status: number; message: string; triedRegisters: KrsRejestr[] }
> {
  const normalized = normalizeKrs(krs);
  if (!normalized) {
    return {
      ok: false,
      status: 400,
      message: "Nieprawidłowy numer KRS.",
      triedRegisters: [rejestr],
    };
  }

  const registers: KrsRejestr[] = rejestr === "P" ? ["P", "S"] : ["S", "P"];
  const tried: KrsRejestr[] = [];

  for (const reg of registers) {
    tried.push(reg);
    const url = `${krsApiBase()}/api/krs/odpisaktualny/${normalized}?rejestr=${reg}&format=json`;
    const res = await fetchJson<unknown>(url);
    if (res.ok) return { ok: true, payload: res.data };
    if (res.status !== 404) {
      return { ok: false, status: res.status, message: res.message, triedRegisters: tried };
    }
  }

  return {
    ok: false,
    status: 404,
    message: "Podmiot nie został znaleziony w Krajowym Rejestrze Sądowym.",
    triedRegisters: tried,
  };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

type MfSearchResponse = {
  result?: { subject?: MfSubject };
};

/** Rejestr podatkowy MF — rozwiązanie NIP/REGON → KRS (gdy podmiot jest w KRS). */
export async function fetchMfSubjectByNip(nip: string): Promise<
  | { ok: true; subject: MfSubject }
  | { ok: false; status: number; message: string }
> {
  const url = `${mfApiBase()}/api/search/nip/${nip}?date=${todayIsoDate()}`;
  const res = await fetchJson<MfSearchResponse>(url);
  if (!res.ok) return res;
  const subject = res.data.result?.subject;
  if (!subject?.name) {
    return { ok: false, status: 404, message: "Nie znaleziono podmiotu dla podanego NIP." };
  }
  return { ok: true, subject };
}

export async function fetchMfSubjectByRegon(regon: string): Promise<
  | { ok: true; subject: MfSubject }
  | { ok: false; status: number; message: string }
> {
  const url = `${mfApiBase()}/api/search/regon/${regon}?date=${todayIsoDate()}`;
  const res = await fetchJson<MfSearchResponse>(url);
  if (!res.ok) return res;
  const subject = res.data.result?.subject;
  if (!subject?.name) {
    return { ok: false, status: 404, message: "Nie znaleziono podmiotu dla podanego REGON." };
  }
  return { ok: true, subject };
}
