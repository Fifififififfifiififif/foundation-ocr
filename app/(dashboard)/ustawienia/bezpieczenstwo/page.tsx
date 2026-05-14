import { PageHeader } from "@/components/layout/page-header";
import { SecuritySettingsForm } from "@/components/settings/security-settings-form";
import { requireOrganizationSettings } from "@/lib/require-organization-settings";

export default async function BezpieczenstwoSettingsPage() {
  const s = await requireOrganizationSettings();
  return (
    <>
      <PageHeader
        title="Bezpieczeństwo"
        description="Czas bezczynności w minutach — ustawienie organizacji (bez zewnętrznego logowania)."
      />
      <SecuritySettingsForm
        initial={{
          sessionTimeoutMinutes: s.sessionTimeoutMinutes,
        }}
      />
    </>
  );
}
