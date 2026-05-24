"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  devLoginAvailable,
  isSupabaseAuthConfigured,
} from "@/src/modules/auth/config";
import {
  clearDevSignedOut,
  setDevSignedOut,
} from "@/src/modules/auth/dev-session.server";
import {
  createSupabaseServerClient,
  requireSupabaseServerClient,
} from "@/src/modules/auth/supabase/server";
import { signOutSupabase } from "@/src/modules/auth/session";
import {
  completePendingSignup,
  createOrganizationForUser,
  ensureUserProfile,
} from "@/src/modules/organizations/onboarding";
import { setActiveOrganization } from "@/src/modules/organizations/context";
import { getAppContext } from "@/lib/app-context";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

export async function signInWithPassword(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    redirect(`/logowanie?error=${encodeURIComponent("Email i hasło są wymagane.")}`);
  }

  if (!isSupabaseAuthConfigured()) {
    redirect(
      `/logowanie?error=${encodeURIComponent(
        "Dodaj NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY do pliku .env (Supabase → Project Settings → API).",
      )}`,
    );
  }

  const supabase = await requireSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/logowanie?error=${encodeURIComponent(error.message)}`);

  await clearDevSignedOut();

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const dbUser = await ensureUserProfile({
      supabaseUserId: data.user.id,
      email: data.user.email ?? email,
      name: data.user.user_metadata?.full_name ?? email,
    });
    await completePendingSignup({
      userId: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      metadata: data.user.user_metadata,
    });
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUpWithPassword(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const orgName = String(formData.get("organizationName") ?? "").trim();
  const orgKrs = String(formData.get("organizationKrs") ?? "").trim();
  const orgNip = String(formData.get("organizationNip") ?? "").trim();
  const orgRegon = String(formData.get("organizationRegon") ?? "").trim();
  const orgAddress = String(formData.get("organizationAddress") ?? "").trim();
  const orgLegalForm = String(formData.get("organizationLegalForm") ?? "").trim();
  const orgRegistryStatus = String(formData.get("organizationRegistryStatus") ?? "").trim();
  const orgRegistryVerified = String(formData.get("organizationRegistryVerified") ?? "") === "1";

  if (!email || !password) {
    redirect(`/rejestracja?error=${encodeURIComponent("Email i hasło są wymagane.")}`);
  }
  if (password.length < 8) {
    redirect(`/rejestracja?error=${encodeURIComponent("Hasło musi mieć co najmniej 8 znaków.")}`);
  }

  if (!isSupabaseAuthConfigured()) {
    redirect(
      `/rejestracja?error=${encodeURIComponent(
        "Dodaj NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY do pliku .env.",
      )}`,
    );
  }

  const supabase = await requireSupabaseServerClient();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name || email,
        organization_name: orgName || `${name || "Moja"} organizacja`,
        organization_krs: orgKrs || undefined,
        organization_nip: orgNip || undefined,
        organization_regon: orgRegon || undefined,
        organization_address: orgAddress || undefined,
        organization_legal_form: orgLegalForm || undefined,
        organization_registry_status: orgRegistryStatus || undefined,
        organization_registry_verified: orgRegistryVerified ? "1" : "0",
      },
      emailRedirectTo: `${base}/logowanie?confirmed=1`,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase().includes("rate limit")
      ? "Limit wysyłki emaili — odczekaj kilka minut lub w Supabase wyłącz Confirm email (Auth → Providers → Email) na czas developmentu."
      : error.message;
    redirect(`/rejestracja?error=${encodeURIComponent(msg)}`);
  }

  await clearDevSignedOut();

  const authUser = data.user;
  if (!authUser) {
    redirect(
      `/rejestracja?error=${encodeURIComponent(
        "Ten adres email może być już zarejestrowany. Spróbuj się zalogować. Jeśli dopiero rejestrowałeś konto, sprawdź skrzynkę (link potwierdzający).",
      )}`,
    );
  }

  // Wymagane potwierdzenie email — sesja pusta, org powstanie przy pierwszym logowaniu
  if (!data.session) {
    redirect(`/rejestracja?pending=1&email=${encodeURIComponent(email)}`);
  }

  const dbUser = await ensureUserProfile({
    supabaseUserId: authUser.id,
    email,
    name: name || email,
  });

  const org = await createOrganizationForUser({
    userId: dbUser.id,
    name: orgName || `${name || "Moja"} organizacja`,
    email,
    userName: name || email,
    role: "OWNER",
    registry: {
      krs: orgKrs || null,
      nip: orgNip || null,
      regon: orgRegon || null,
      address: orgAddress || null,
      legalForm: orgLegalForm || null,
      registryStatus: orgRegistryStatus || null,
      requestKrsVerification: orgRegistryVerified,
    },
  });

  revalidatePath("/", "layout");
  redirect(
    `/onboarding/welcome?org=${encodeURIComponent(org.name)}&new=1`,
  );
}

export async function signOutAction() {
  await signOutSupabase();
  await setDevSignedOut();
  revalidatePath("/", "layout");
  redirect("/logowanie?signedOut=1");
}

/** Dev: wejście bez Supabase Auth (gdy brak kluczy w .env). */
export async function continueAsDevAction() {
  if (!devLoginAvailable()) {
    redirect("/logowanie?error=Tryb+demo+niedostępny.");
  }
  await clearDevSignedOut();
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(`/zapomniane-haslo?error=${encodeURIComponent("Podaj adres email.")}`);
  }

  if (!isSupabaseAuthConfigured()) {
    redirect(
      `/zapomniane-haslo?error=${encodeURIComponent("Reset hasła wymaga skonfigurowanego Supabase Auth.")}`,
    );
  }

  const supabase = await requireSupabaseServerClient();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/auth/callback?next=${encodeURIComponent("/reset-hasla")}`,
  });
  if (error) redirect(`/zapomniane-haslo?error=${encodeURIComponent(error.message)}`);
  redirect("/zapomniane-haslo?sent=1");
}

export async function switchOrganizationAction(organizationId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const { user } = await getAppContext();
    await setActiveOrganization(user.id, organizationId);
    revalidatePath("/", "layout");
    redirect("/dashboard");
    return;
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/logowanie");

  const dbUser = await ensureUserProfile({
    supabaseUserId: data.user.id,
    email: data.user.email ?? "",
    name: data.user.user_metadata?.full_name ?? "",
  });

  await setActiveOrganization(dbUser.id, organizationId);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
