import { PageHeader } from "@/components/layout/page-header";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import { requireOrganizationSettings } from "@/lib/require-organization-settings";

export default async function PowiadomieniaSettingsPage() {
  const s = await requireOrganizationSettings();
  return (
    <>
      <PageHeader
        title="Powiadomienia"
        description="Powiadomienia w aplikacji (skrzynka w panelu). Alerty e-mail nie są jeszcze wysyłane."
      />
      <NotificationSettingsForm
        initial={{
          emailAlertsOcr: s.emailAlertsOcr,
          emailAlertsExport: s.emailAlertsExport,
        }}
      />
    </>
  );
}
