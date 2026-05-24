import { type NextRequest, NextResponse } from "next/server";

import {
  authBypassEnabled,
  devLoginAvailable,
  isSupabaseAuthConfigured,
} from "@/src/modules/auth/config";
import { hasForcedDevUser, isDevSignedOutFromRequest } from "@/src/modules/auth/dev-session.shared";
import {
  getSupabaseUserFromRequest,
  updateSupabaseSession,
} from "@/src/modules/auth/supabase/middleware";

const PUBLIC_PATHS = [
  "/logowanie",
  "/rejestracja",
  "/zapomniane-haslo",
  "/reset-hasla",
  "/zaproszenie",
  "/auth/callback",
  "/api/krs",
];

const AUTH_PATHS = ["/logowanie", "/rejestracja", "/zapomniane-haslo", "/reset-hasla"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function devBypassActive(request: NextRequest): boolean {
  if (isDevSignedOutFromRequest(request.cookies)) return false;
  return authBypassEnabled() || hasForcedDevUser();
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/files") ||
    pathname.startsWith("/api/cron") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const response = await updateSupabaseSession(request);
  const signedOut = isDevSignedOutFromRequest(request.cookies);

  if (isPublicPath(pathname)) {
    if (signedOut) return response;
    if (devBypassActive(request)) return response;
    if (!isSupabaseAuthConfigured()) return response;

    const user = await getSupabaseUserFromRequest(request);
    if (user && AUTH_PATHS.includes(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (devBypassActive(request)) {
    return response;
  }

  if (!isSupabaseAuthConfigured()) {
    const login = new URL("/logowanie", request.url);
    login.searchParams.set("next", pathname);
    if (devLoginAvailable()) {
      login.searchParams.set("hint", "dev");
    }
    return NextResponse.redirect(login);
  }

  const user = await getSupabaseUserFromRequest(request);

  if (!user) {
    const login = new URL("/logowanie", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (AUTH_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
