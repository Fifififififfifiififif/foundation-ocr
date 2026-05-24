import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { getOrganizationById } from "@/lib/organization-settings";
import { getAppContext } from "@/lib/app-context";

export default async function OrganizationSettingsPage() {
  const { organizationId } = await getAppContext();
  const s = await getOrganizationById(organizationId);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Organizacja"
        description="Dane identyfikacyjne, NIP, REGON, KRS i logo Twojej organizacji."
      />
      <OrganizationSettingsForm
        initial={{
          organizationName: s.name,
          tagline: s.tagline ?? "",
          contactEmail: s.contactEmail ?? "",
          phone: s.phone ?? "",
          address: s.address ?? "",
          organizationInfo: s.organizationInfo ?? "",
          nip: s.nip ?? "",
          regon: s.regon ?? "",
          krs: s.krs ?? "",
          legalForm: s.legalForm ?? "",
          registryStatus: s.registryStatus ?? "",
          verifiedAt: s.verifiedAt,
          logoPath: s.logoPath,
        }}
      />
    </div>
  );
}
