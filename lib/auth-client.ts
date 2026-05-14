import { createAuthClient } from "better-auth/react";

function clientBaseURL(): string | undefined {
  const raw =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  const trimmed = raw.replace(/\/$/, "");
  return trimmed || undefined;
}

export const authClient = createAuthClient({
  baseURL: clientBaseURL(),
});

export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;

/** Wywołanie endpointu Better Auth pod `/api/auth/...`. */
export async function authFetch(
  path: string,
  init: { method?: string; body?: Record<string, unknown> },
): Promise<void> {
  const base = clientBaseURL() ?? "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}/api/auth${normalized}`;
  const res = await fetch(url, {
    method: init.method ?? "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(init.body ?? {}),
  });
  if (!res.ok) {
    throw new Error(await res.text().catch(() => res.statusText));
  }
}
