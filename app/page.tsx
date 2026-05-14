import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { parseDashboardPrefs } from "@/lib/dashboard-prefs";
import { getOrganizationById } from "@/lib/organization-settings";
import prisma from "@/lib/prisma";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect("/logowanie");
  }

  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true },
  });
  if (!row?.organizationId) {
    redirect("/logowanie?komunikat=brak-organizacji");
  }

  let dest: "/dashboard" | "/documents" = "/dashboard";
  try {
    const s = await getOrganizationById(row.organizationId);
    dest = parseDashboardPrefs(s.dashboardPreferences).defaultLanding;
  } catch {
    /* brak bazy przy buildzie */
  }
  redirect(dest);
}
