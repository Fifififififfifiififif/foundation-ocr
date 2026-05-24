/** Ciasteczko: użytkownik kliknął „Wyloguj” w trybie dev (bez Supabase Auth). */
export const DEV_SIGNED_OUT_COOKIE = "saas_dev_signed_out";

export function hasForcedDevUser(): boolean {
  return Boolean(process.env.DEV_USER_ID?.trim() || process.env.APP_USER_ID?.trim());
}

export function isDevSignedOutFromRequest(
  requestCookies: { get: (name: string) => { value: string } | undefined },
): boolean {
  return requestCookies.get(DEV_SIGNED_OUT_COOKIE)?.value === "1";
}
