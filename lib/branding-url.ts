/** Typ danych brandingowych bezpieczny dla klienta (bez importu Prisma). */
export type PublicBranding = {
  foundationName: string;
  tagline: string | null;
  logoPath: string | null;
  accentColor: string;
};

/** Publiczny URL logo — endpoint serwuje plik wg `logoPath` w bazie. */
export function brandingLogoUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath?.trim()) return null;
  return "/api/branding/logo";
}
