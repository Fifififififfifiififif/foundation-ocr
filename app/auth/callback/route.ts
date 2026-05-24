import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/src/modules/auth/supabase/server";

/** Wymiana kodu OAuth / recovery z Supabase na sesję (PKCE). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/logowanie?error=${encodeURIComponent("Brak kodu autoryzacji.")}`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      `${origin}/logowanie?error=${encodeURIComponent("Supabase Auth nie jest skonfigurowany.")}`,
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/logowanie?error=${encodeURIComponent(error.message)}`);
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
