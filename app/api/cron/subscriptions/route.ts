import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { processSubscriptionLifecycle } from "@/src/modules/subscription/lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Codzienny audyt subskrypcji — wywołaj przez cron (Authorization: Bearer CRON_SECRET). */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await prisma.subscription.findMany({
    select: { organizationId: true },
  });

  let downgraded = 0;
  for (const sub of subs) {
    const before = await prisma.subscription.findUnique({
      where: { organizationId: sub.organizationId },
      select: { plan: true },
    });
    await processSubscriptionLifecycle(sub.organizationId);
    const after = await prisma.subscription.findUnique({
      where: { organizationId: sub.organizationId },
      select: { plan: true, status: true },
    });
    if (before?.plan !== "free" && after?.plan === "free") downgraded += 1;
  }

  return NextResponse.json({
    ok: true,
    processed: subs.length,
    downgraded,
    ranAt: new Date().toISOString(),
  });
}
