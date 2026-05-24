import { hasForcedDevUser } from "@/src/modules/auth/dev-session.shared";

/** Czy Supabase Auth jest skonfigurowany (URL + klucz anon). */
export function isSupabaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

/** Dev / lokalnie bez Supabase — open access jak wcześniej. */
export function authBypassEnabled(): boolean {
  return (
    process.env.AUTH_BYPASS === "1" ||
    (process.env.NODE_ENV === "development" && !isSupabaseAuthConfigured())
  );
}

/** Strona logowania: pokaż „Kontynuuj jako demo” bez Supabase Auth. */
export function devLoginAvailable(): boolean {
  return authBypassEnabled() || hasForcedDevUser();
}
