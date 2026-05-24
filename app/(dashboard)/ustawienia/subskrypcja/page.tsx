import { SubscriptionBillingPanel } from "@/components/billing/subscription-billing-panel";
import { PageHeader } from "@/components/layout/page-header";
import { getAppContext } from "@/lib/app-context";
import prisma from "@/lib/prisma";
import { limitsForUi } from "@/src/modules/subscription/format-limits";

export default async function SubscriptionSettingsPage() {
  const ctx = await getAppContext();
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { verifiedAt: true, registryStatus: true, krs: true },
  });

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Subskrypcja i rozliczenia"
        description="Plan organizacji, limity wykorzystania oraz data ważności subskrypcji."
      />
      <div className="mt-6">
        <SubscriptionBillingPanel
          subscription={ctx.subscription}
          usage={ctx.entitlement.usage}
          limits={limitsForUi(ctx.entitlement.limits)}
          krsLookupEnabled={ctx.entitlement.features.krs}
          organizationRegistry={
            org
              ? {
                  verifiedAt: org.verifiedAt,
                  registryStatus: org.registryStatus,
                  krs: org.krs,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
