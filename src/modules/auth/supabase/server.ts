import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { isSupabaseAuthConfigured } from "@/src/modules/auth/config";

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseAuthConfigured()) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component — cookie writes may fail; proxy handles refresh
        }
      },
    },
  });
}

export async function requireSupabaseServerClient(): Promise<SupabaseClient> {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw new Error(
      "Skonfiguruj NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY w .env.local",
    );
  }
  return client;
}

/** Usuwa ciasteczka sesji Supabase (np. przy wylogowaniu bez klienta). */
export async function clearSupabaseAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  for (const c of cookieStore.getAll()) {
    if (c.name.startsWith("sb-") || c.name.includes("auth-token")) {
      cookieStore.delete(c.name);
    }
  }
  cookieStore.delete("active_organization_id");
}
