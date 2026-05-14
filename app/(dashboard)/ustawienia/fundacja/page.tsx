import { PageHeader } from "@/components/layout/page-header";
import { FoundationSettingsForm } from "@/components/settings/foundation-settings-form";
import { requireOrganizationSettings } from "@/lib/require-organization-settings";

export default async function FundacjaSettingsPage() {
  const s = await requireOrganizationSettings();
  return (
    <>
      <PageHeader
        title="Fundacja"
        description="Logo, nazwa, dane identyfikacyjne i kontakt — widoczne w panelu oraz na stronie logowania. Kolory interfejsu ustawisz w sekcji Wygląd."
      />
      <FoundationSettingsForm
        initial={{
          foundationName: s.name,
          tagline: s.tagline,
          contactEmail: s.contactEmail,
          phone: s.phone,
          address: s.address,
          organizationInfo: s.organizationInfo,
          nip: s.nip,
          regon: s.regon,
          krs: s.krs,
          logoPath: s.logoPath,
        }}
      />
    </>
  );
}
