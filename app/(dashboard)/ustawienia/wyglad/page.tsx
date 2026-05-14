import { AppearanceSettingsForm } from "@/components/settings/appearance-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireOrganizationSettings } from "@/lib/require-organization-settings";
import { parseDashboardPrefs } from "@/lib/dashboard-prefs";

export default async function WygladSettingsPage() {
  const s = await requireOrganizationSettings();
  const prefs = parseDashboardPrefs(s.dashboardPreferences);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Wygląd i pulpit"
        description="Tryb jasny lub ciemny, kolory interfejsu, styl nawigacji, gęstość oraz moduły na stronie głównej. Ustawienia obowiązują dla całej organizacji. Dane identyfikacyjne fundacji edytujesz w sekcji Fundacja."
      />
      <AppearanceSettingsForm
        appearanceTheme={s.appearanceTheme}
        sidebarStyle={s.sidebarStyle}
        uiDensity={s.uiDensity}
        dashboardPrefs={prefs}
        accentColor={s.accentColor}
        fontColor={s.fontColor}
      />
    </div>
  );
}
