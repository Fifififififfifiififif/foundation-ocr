import "server-only";

import { cookies } from "next/headers";

import { DEV_SIGNED_OUT_COOKIE } from "@/src/modules/auth/dev-session.shared";

export { DEV_SIGNED_OUT_COOKIE, hasForcedDevUser, isDevSignedOutFromRequest } from "@/src/modules/auth/dev-session.shared";

export async function isDevSignedOut(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(DEV_SIGNED_OUT_COOKIE)?.value === "1";
}

export async function setDevSignedOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEV_SIGNED_OUT_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearDevSignedOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEV_SIGNED_OUT_COOKIE);
}
