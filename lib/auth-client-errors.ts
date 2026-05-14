/** Tekst błędu z odpowiedzi klienta Better Auth / better-fetch (często bez `message`). */
export function describeAuthClientError(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (typeof err !== "object") return String(err);

  const o = err as Record<string, unknown>;
  if (typeof o.message === "string" && o.message.trim()) return o.message.trim();

  const body = o.body;
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.message === "string" && b.message.trim()) return b.message.trim();
    if (typeof b.error === "string" && b.error.trim()) return b.error.trim();
  }

  if (typeof o.status === "number") {
    const statusText = typeof o.statusText === "string" ? o.statusText : "";
    return statusText ? `HTTP ${o.status} ${statusText}` : `HTTP ${o.status}`;
  }

  if (typeof o.code === "string" && o.code.trim()) return o.code.trim();

  try {
    const s = JSON.stringify(err);
    if (s !== "{}") return s;
  } catch {
    /* ignore */
  }
  return "Nieznany błąd uwierzytelniania.";
}
