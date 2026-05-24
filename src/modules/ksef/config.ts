import type { KsefEnvironment } from "@/src/modules/ksef/types";

const BASE_URLS: Record<KsefEnvironment, string> = {
  test: "https://api-test.ksef.mf.gov.pl",
  prod: "https://api.ksef.mf.gov.pl",
};

export function ksefBaseUrl(environment: KsefEnvironment): string {
  const override =
    environment === "prod"
      ? process.env.KSEF_API_BASE_URL_PROD
      : process.env.KSEF_API_BASE_URL_TEST;
  return (override?.trim() || BASE_URLS[environment]).replace(/\/$/, "");
}

export function ksefTimeoutMs(): number {
  const n = Number(process.env.KSEF_API_TIMEOUT_MS ?? 20_000);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 60_000) : 20_000;
}
