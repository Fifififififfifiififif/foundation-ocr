import { redirect } from "next/navigation";

import { parseDashboardPrefs } from "@/lib/dashboard-prefs";
import { getDevOrganizationId } from "@/lib/app-context";
import { getOrganizationById } from "@/lib/organization-settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const orgId = await getDevOrganizationId();
  if (!orgId) {
    redirect("/dashboard");
  }

  let dest: "/dashboard" | "/documents" = "/dashboard";
  try {
    const s = await getOrganizationById(orgId);
    dest = parseDashboardPrefs(s.dashboardPreferences).defaultLanding;
  } catch {
    /* brak bazy przy buildzie */
  }
  redirect(dest);
}
