import { NextResponse } from "next/server";

import { getApiAppContext } from "@/lib/api-app-context";
import { enforceApiFeature } from "@/lib/api-entitlement";
import { lookupOrganizationRegistry } from "@/src/modules/krs/service";
import { checkKrsLookupRateLimit } from "@/src/modules/krs/rate-limit";
import { krsLookupBodySchema } from "@/src/modules/krs/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Nieprawidłowe żądanie JSON." }, { status: 400 });
  }

  const parsed = krsLookupBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji." },
      { status: 400 },
    );
  }

  const auth = await getApiAppContext();
  if (auth.ok) {
    const denied = enforceApiFeature(auth.ctx, "krs");
    if (denied) return denied;
  } else {
    const limit = checkKrsLookupRateLimit(clientIp(request));
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Zbyt wiele zapytań. Spróbuj za chwilę." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSec) },
        },
      );
    }
  }

  const result = await lookupOrganizationRegistry(parsed.data);

  if (!result.ok) {
    const status =
      result.code === "VALIDATION"
        ? 400
        : result.code === "KRS_NOT_FOUND" || result.code === "MF_NOT_FOUND"
          ? 404
          : 502;
    return NextResponse.json({ ok: false, error: result.message, code: result.code }, { status });
  }

  return NextResponse.json({
    ok: true,
    profile: result.profile,
    hasOfficialKrsData: result.profile.verifiedFromKrs,
    source: result.profile.source,
  });
}
