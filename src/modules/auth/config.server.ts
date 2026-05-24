import "server-only";

import { authBypassEnabled } from "@/src/modules/auth/config";
import { hasForcedDevUser, isDevSignedOut } from "@/src/modules/auth/dev-session.server";

/** Czy wolno używać kontekstu dev (DEV_USER_ID / bypass) zamiast Supabase. */
export async function shouldUseDevAuthContext(): Promise<boolean> {
  if (await isDevSignedOut()) return false;
  return authBypassEnabled() || hasForcedDevUser();
}
