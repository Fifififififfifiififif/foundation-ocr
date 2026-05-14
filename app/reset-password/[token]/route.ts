import { NextResponse, type NextRequest } from "next/server";

/** Better Auth wysyła link `/reset-password/:token` (bez prefiksu `/api/auth`); przekieruj na handler API. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const u = new URL(request.url);
  const callback = u.searchParams.get("callbackURL") ?? "";
  const target = new URL(`/api/auth/reset-password/${token}`, u.origin);
  if (callback) target.searchParams.set("callbackURL", callback);
  return NextResponse.redirect(target);
}
