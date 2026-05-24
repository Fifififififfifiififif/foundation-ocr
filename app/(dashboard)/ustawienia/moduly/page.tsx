import { OrganizationModulesOverview } from "@/components/settings/organization-modules-overview";
import { PageHeader } from "@/components/layout/page-header";
import { getAppContext } from "@/lib/app-context";
import prisma from "@/lib/prisma";
import { prismaValidModuleKeys } from "@/src/modules/organizations/modules";

export default async function OrganizationModulesPage() {
  const { organizationId } = await getAppContext();

  const validKeys = prismaValidModuleKeys();
  const [modules, orgModules] = await Promise.all([
    prisma.module.findMany({
      where: { key: { in: validKeys } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.organizationModule.findMany({
      where: { organizationId, module: { key: { in: validKeys } } },
      select: { moduleId: true, enabled: true, disabledAt: true },
    }),
  ]);

  const orgByModuleId = new Map(orgModules.map((om) => [om.moduleId, om]));

  const rows = modules.map((mod) => {
    const om = orgByModuleId.get(mod.id);
    return {
      key: mod.key,
      name: mod.name,
      description: mod.description,
      isCore: mod.isCore,
      enabled: om?.enabled ?? false,
      disabledAt: om?.disabledAt ?? null,
    };
  });

  return (
    <>
      <PageHeader
        title="Moduły organizacji"
        description="Przegląd funkcji włączonych i wyłączonych dla Twojej organizacji — bez możliwości edycji z poziomu użytkownika."
      />
      <div className="mt-6">
        <OrganizationModulesOverview rows={rows} />
      </div>
    </>
  );
}
