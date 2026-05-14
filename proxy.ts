import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PREFIXES = [
  "/logowanie",
  "/rejestracja",
  "/zapomniane-haslo",
  "/reset-hasla",
  "/reset-password",
  "/api/auth",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const login = new URL("/logowanie", request.url);
    const dest = pathname + request.nextUrl.search;
    if (dest && dest !== "/") login.searchParams.set("callbackUrl", dest);
    return NextResponse.redirect(login);
  }

  if (sessionCookie && (pathname === "/logowanie" || pathname === "/rejestracja")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api/files|favicon\\.ico|.*\\.).*)"],
};
