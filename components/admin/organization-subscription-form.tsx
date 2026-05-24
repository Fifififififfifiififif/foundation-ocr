"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  extendOrganizationSubscriptionAction,
  updateOrganizationSubscriptionAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { PLAN_DEFINITIONS, SAAS_PLAN_IDS } from "@/src/modules/subscription/plans";

type Props = {
  organizationId: string;
  plan: string;
  status: string;
};

const STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
  "suspended",
] as const;

export function OrganizationSubscriptionForm({ organizationId, plan, status }: Props) {
  const [pending, startTransition] = useTransition();
  const [extendPending, startExtend] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            await updateOrganizationSubscriptionAction(fd);
            toast.success("Plan organizacji zaktualizowany.");
          });
        }}
      >
        <input type="hidden" name="organizationId" value={organizationId} />
        <select
          name="plan"
          defaultValue={plan}
          className="border-input bg-background h-8 rounded-md border px-2 text-sm"
        >
          {SAAS_PLAN_IDS.map((p) => (
            <option key={p} value={p}>
              {PLAN_DEFINITIONS[p].label}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status}
          className="border-input bg-background h-8 rounded-md border px-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Zapisz plan
        </Button>
      </form>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startExtend(async () => {
            const result = await extendOrganizationSubscriptionAction(fd);
            if (result.ok) {
              toast.success("Przedłużono subskrypcję.");
            } else {
              toast.error(result.error ?? "Nie udało się przedłużyć subskrypcji.");
            }
          });
        }}
      >
        <input type="hidden" name="organizationId" value={organizationId} />
        <select
          name="days"
          defaultValue="30"
          className="border-input bg-background h-8 rounded-md border px-2 text-sm"
        >
          <option value="7">+7 dni</option>
          <option value="14">+14 dni</option>
          <option value="30">+30 dni</option>
          <option value="90">+90 dni</option>
        </select>
        <Button type="submit" size="sm" variant="secondary" disabled={extendPending}>
          Przedłuż
        </Button>
      </form>
    </div>
  );
}
