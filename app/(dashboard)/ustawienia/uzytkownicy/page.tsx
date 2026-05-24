import { redirect } from "next/navigation";

import { listOrgUsers } from "@/app/actions/users";
import { OrgUsersManager } from "@/components/settings/org-users-manager";
import { PageHeader } from "@/components/layout/page-header";
import { DbSetupRequired } from "@/components/layout/db-setup-required";
import { getAppContext } from "@/lib/app-context";
import { isPrismaMissingSchemaObject } from "@/lib/prisma-recoverable";
import { canManageUsers, isOrganizationOwner } from "@/src/modules/permissions/hierarchy";

export const dynamic = "force-dynamic";

export default async function UzytkownicyPage() {
  const ctx = await getAppContext();
  if (!canManageUsers(ctx.user.role)) {
    redirect("/odmowa-dostepu");
  }

  let users: Awaited<ReturnType<typeof listOrgUsers>>;
  try {
    users = await listOrgUsers();
  } catch (e) {
    if (isPrismaMissingSchemaObject(e)) {
      return <DbSetupRequired title="Użytkownicy" />;
    }
    throw e;
  }

  return (
    <>
      <PageHeader
        title="Użytkownicy organizacji"
        description="Twórz konta, wysyłaj zaproszenia i zarządzaj rolami w swoim workspace (tenant)."
      />
      <OrgUsersManager
        users={users}
        currentUserId={ctx.user.id}
        canAssignOwner={isOrganizationOwner(ctx.user.role)}
      />
    </>
  );
}
