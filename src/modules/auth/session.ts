import {
  clearSupabaseAuthCookies,
  createSupabaseServerClient,
} from "@/src/modules/auth/supabase/server";

export async function getSupabaseAuthUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function signOutSupabase() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
    return;
  }
  await clearSupabaseAuthCookies();
}
