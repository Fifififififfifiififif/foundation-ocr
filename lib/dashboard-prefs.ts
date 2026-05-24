import type { ModuleKey } from "@/generated/prisma";

export type DashboardWidgetsPrefs = {
  kpi: boolean;
  calendar: boolean;
  charts: boolean;
  projectsBreakdown: boolean;
  recent: boolean;
};

export type DashboardPrefs = {
  defaultLanding: "/dashboard" | "/documents";
  widgets: DashboardWidgetsPrefs;
};

export const DEFAULT_DASHBOARD_PREFS: DashboardPrefs = {
  defaultLanding: "/dashboard",
  widgets: {
    kpi: true,
    calendar: true,
    charts: true,
    projectsBreakdown: true,
    recent: true,
  },
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Normalizuje JSON z bazy do pełnego obiektu preferencji pulpitu. */
export function parseDashboardPrefs(raw: unknown): DashboardPrefs {
  if (!isRecord(raw)) return { ...DEFAULT_DASHBOARD_PREFS, widgets: { ...DEFAULT_DASHBOARD_PREFS.widgets } };
  const landing = raw.defaultLanding;
  const defLanding =
    landing === "/documents" || landing === "/dashboard"
      ? landing
      : DEFAULT_DASHBOARD_PREFS.defaultLanding;
  const w = isRecord(raw.widgets) ? raw.widgets : {};
  const widgets: DashboardWidgetsPrefs = {
    kpi: typeof w.kpi === "boolean" ? w.kpi : DEFAULT_DASHBOARD_PREFS.widgets.kpi,
    calendar: typeof w.calendar === "boolean" ? w.calendar : DEFAULT_DASHBOARD_PREFS.widgets.calendar,
    charts: typeof w.charts === "boolean" ? w.charts : DEFAULT_DASHBOARD_PREFS.widgets.charts,
    projectsBreakdown:
      typeof w.projectsBreakdown === "boolean"
        ? w.projectsBreakdown
        : DEFAULT_DASHBOARD_PREFS.widgets.projectsBreakdown,
    recent: typeof w.recent === "boolean" ? w.recent : DEFAULT_DASHBOARD_PREFS.widgets.recent,
  };
  return { defaultLanding: defLanding, widgets };
}

/** Widżety pulpitu po uwzględnieniu włączonych modułów organizacji. */
export function effectiveDashboardWidgets(
  prefs: DashboardPrefs,
  enabledModules: ReadonlySet<ModuleKey>,
): DashboardWidgetsPrefs {
  return {
    kpi: prefs.widgets.kpi,
    calendar: prefs.widgets.calendar && enabledModules.has("CALENDAR"),
    charts: prefs.widgets.charts && enabledModules.has("ANALYTICS"),
    projectsBreakdown: prefs.widgets.projectsBreakdown && enabledModules.has("PROJECTS"),
    recent: prefs.widgets.recent,
  };
}
