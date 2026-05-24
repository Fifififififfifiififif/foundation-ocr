/** Domyślny adres konsultanta — nadpisz przez NEXT_PUBLIC_SUPPORT_EMAIL w .env */
export const SUPPORT_EMAIL_DEFAULT = "konsultant@twojadomena.pl";

export const SUPPORT_MAIL_SUBJECT = "Kontakt z aplikacji";

export const SUPPORT_MAIL_BODY = "Dzień dobry, potrzebuję pomocy dotyczącej aplikacji.";

/** Adres odbiorcy wsparcia (edytuj w .env: NEXT_PUBLIC_SUPPORT_EMAIL). */
export function getSupportEmail(): string {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || SUPPORT_EMAIL_DEFAULT;
  return raw.replace(/^mailto:/i, "");
}

/** Link mailto otwierany po kliknięciu „Skontaktuj się z konsultantem”. */
export function buildSupportMailtoUrl(): string {
  const to = getSupportEmail();
  const params = new URLSearchParams({
    subject: SUPPORT_MAIL_SUBJECT,
    body: SUPPORT_MAIL_BODY,
  });
  return `mailto:${to}?${params.toString()}`;
}
