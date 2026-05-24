import type { KsefEnvironment, KsefSession } from "@/src/modules/ksef/types";
import { ksefBaseUrl, ksefTimeoutMs } from "@/src/modules/ksef/config";

type Json = Record<string, unknown>;

async function ksefFetch<T>(
  environment: KsefEnvironment,
  path: string,
  init?: RequestInit & { token?: string },
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ksefTimeoutMs());
  try {
    const res = await fetch(`${ksefBaseUrl(environment)}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        message: text || `KSeF HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      status: aborted ? 408 : 502,
      message: aborted ? "Przekroczono czas oczekiwania KSeF." : "Błąd połączenia z KSeF.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Uwierzytelnienie tokenem KSeF (API v2 — uproszczony flow). */
export async function authenticateKsefToken(input: {
  environment: KsefEnvironment;
  nip: string;
  token: string;
}): Promise<{ ok: true; session: KsefSession; metadata: Json } | { ok: false; message: string }> {
  const challenge = await ksefFetch<{ challenge?: string; timestamp?: string }>(
    input.environment,
    "/api/v2/auth/challenge",
    { method: "POST", body: JSON.stringify({ identifier: input.nip, identifierType: "NIP" }) },
  );
  if (!challenge.ok) {
    return { ok: false, message: challenge.message };
  }

  const auth = await ksefFetch<{
    accessToken?: { token?: string; validUntil?: string };
    refreshToken?: { token?: string };
    referenceNumber?: string;
  }>(input.environment, "/api/v2/auth/ksef-token", {
    method: "POST",
    body: JSON.stringify({
      challenge: challenge.data.challenge,
      contextIdentifier: { type: "NIP", value: input.nip },
      encryptedToken: input.token,
    }),
  });

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const access = auth.data.accessToken?.token;
  if (!access) return { ok: false, message: "KSeF nie zwróciło tokenu sesji." };

  const expiresAt = auth.data.accessToken?.validUntil
    ? new Date(auth.data.accessToken.validUntil)
    : new Date(Date.now() + 55 * 60 * 1000);

  return {
    ok: true,
    session: {
      accessToken: access,
      refreshToken: auth.data.refreshToken?.token,
      expiresAt,
      sessionReference: auth.data.referenceNumber,
    },
    metadata: { challenge: challenge.data, auth: auth.data },
  };
}

export async function queryKsefInvoices(input: {
  environment: KsefEnvironment;
  accessToken: string;
  nip: string;
  direction: "received" | "issued";
  dateFrom?: string;
  dateTo?: string;
  pageSize?: number;
}): Promise<{ ok: true; items: Json[] } | { ok: false; message: string }> {
  const subjectType = input.direction === "received" ? "Subject2" : "Subject1";
  const body: Json = {
    subjectType,
    subjectIdentifier: { type: "NIP", value: input.nip },
    dateRange: {
      dateType: "Issue",
      from: input.dateFrom,
      to: input.dateTo,
    },
    pageSize: input.pageSize ?? 50,
  };

  const res = await ksefFetch<{ invoiceHeaderList?: Json[]; invoices?: Json[] }>(
    input.environment,
    "/api/v2/invoices/query/metadata",
    {
      method: "POST",
      token: input.accessToken,
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) return res;
  const items = res.data.invoiceHeaderList ?? res.data.invoices ?? [];
  return { ok: true, items };
}

export async function fetchKsefInvoiceByReference(input: {
  environment: KsefEnvironment;
  accessToken: string;
  ksefReference: string;
}): Promise<{ ok: true; xml: string } | { ok: false; message: string }> {
  const res = await ksefFetch<{ invoice?: string; xml?: string }>(
    input.environment,
    `/api/v2/invoices/ksef/${encodeURIComponent(input.ksefReference)}`,
    { method: "GET", token: input.accessToken },
  );
  if (!res.ok) return res;
  const xml = res.data.invoice ?? res.data.xml;
  if (!xml) return { ok: false, message: "Brak treści faktury KSeF." };
  return { ok: true, xml: typeof xml === "string" ? xml : JSON.stringify(xml) };
}

export async function fetchKsefSubmissionStatus(input: {
  environment: KsefEnvironment;
  accessToken: string;
  reference: string;
}): Promise<{ ok: true; status: Json } | { ok: false; message: string }> {
  const res = await ksefFetch<Json>(
    input.environment,
    `/api/v2/sessions/status/${encodeURIComponent(input.reference)}`,
    { method: "GET", token: input.accessToken },
  );
  if (!res.ok) return res;
  return { ok: true, status: res.data };
}
