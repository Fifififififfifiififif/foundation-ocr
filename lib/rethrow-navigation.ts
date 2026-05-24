import { isRedirectError } from "next/dist/client/components/redirect-error";

/** Przekaż dalej redirect() — nie traktuj jako zwykłego błędu w catch. */
export function rethrowNextNavigation(error: unknown): void {
  if (isRedirectError(error)) {
    throw error;
  }
}
