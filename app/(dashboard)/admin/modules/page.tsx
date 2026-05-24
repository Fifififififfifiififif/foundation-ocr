import { PageHeader } from "@/components/layout/page-header";
import { requireSuperAdmin } from "@/lib/require-permission";
import prisma from "@/lib/prisma";
import { AdminModuleToggle } from "@/components/admin/admin-module-toggle";
import { prismaValidModuleKeys } from "@/src/modules/organizations/modules";

export default async function AdminModulesPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const orgId = sp.org ?? "org_default";

  const [orgs, modules, orgModules] = await Promise.all([
    prisma.organization.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
    prisma.module.findMany({
      where: { key: { in: prismaValidModuleKeys() } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.organizationModule.findMany({
      where: {
        organizationId: orgId,
        module: { key: { in: prismaValidModuleKeys() } },
      },
      include: { module: true },
    }),
  ]);

  const enabledByModuleId = new Map(orgModules.map((om) => [om.moduleId, om.enabled]));

  return (
    <div>
      <PageHeader
        title="Moduły organizacji"
        description="Włączaj i wyłączaj moduły SaaS per tenant."
      />
      <p className="text-muted-foreground mb-4 text-sm">
        Organizacja: <strong>{orgs.find((o) => o.id === orgId)?.name ?? orgId}</strong>
      </p>
      <ul className="mb-6 flex flex-wrap gap-2">
        {orgs.map((o) => (
          <li key={o.id}>
            <a
              href={`/admin/modules?org=${o.id}`}
              className={`rounded-md border px-3 py-1 text-sm ${o.id === orgId ? "bg-primary text-primary-foreground" : ""}`}
            >
              {o.name}
            </a>
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        {modules.map((m) => (
          <AdminModuleToggle
            key={m.id}
            organizationId={orgId}
            moduleKey={m.key}
            moduleName={m.name}
            enabled={enabledByModuleId.get(m.id) ?? false}
          />
        ))}
      </div>
    </div>
  );
}
