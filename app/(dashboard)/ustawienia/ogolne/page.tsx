import { PageHeader } from "@/components/layout/page-header";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { requireOrganizationSettings } from "@/lib/require-organization-settings";

export default async function OgolneSettingsPage() {
  const s = await requireOrganizationSettings();
  return (
    <>
      <PageHeader
        title="Ogólne"
        description="Strefa czasowa oraz waluta używana w raportach i podsumowaniach."
      />
      <GeneralSettingsForm
        initial={{
          timezone: s.timezone || "Europe/Warsaw",
          currency: s.currency || "PLN",
        }}
      />
    </>
  );
}
