import { describe, expect, it } from "vitest";

import { DEFAULT_DASHBOARD_PREFS, effectiveDashboardWidgets } from "@/lib/dashboard-prefs";
import type { ModuleKey } from "@/generated/prisma";

describe("effectiveDashboardWidgets", () => {
  it("hides analytics and projects when modules are off", () => {
    const enabled = new Set<ModuleKey>(["DOCUMENTS", "INVOICES", "CALENDAR"]);
    const w = effectiveDashboardWidgets(DEFAULT_DASHBOARD_PREFS, enabled);
    expect(w.kpi).toBe(true);
    expect(w.calendar).toBe(true);
    expect(w.charts).toBe(false);
    expect(w.projectsBreakdown).toBe(false);
  });

  it("shows analytics when ANALYTICS module is enabled", () => {
    const enabled = new Set<ModuleKey>(["ANALYTICS"]);
    const w = effectiveDashboardWidgets(DEFAULT_DASHBOARD_PREFS, enabled);
    expect(w.charts).toBe(true);
  });
});
