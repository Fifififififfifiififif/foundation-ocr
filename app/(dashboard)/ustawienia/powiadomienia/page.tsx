import { PageHeader } from "@/components/layout/page-header";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import { requireOrganizationSettings } from "@/lib/require-organization-settings";

export default async function PowiadomieniaSettingsPage() {
  const s = await requireOrganizationSettings();
  return (
    <>
      <PageHeader
        title="Powiadomienia"
        description="Preferencje kanałów informacyjnych — wysyłka e-mail zostanie podłączona przy integracji SMTP."
      />
      <NotificationSettingsForm
        initial={{
          emailAlertsGeneral: s.emailAlertsGeneral,
          emailAlertsOcr: s.emailAlertsOcr,
          emailAlertsExport: s.emailAlertsExport,
        }}
      />
    </>
  );
}
