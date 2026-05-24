"use client";

import { useTransition } from "react";
import type { ModuleKey } from "@/generated/prisma";
import { toggleOrganizationModuleAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  organizationId: string;
  moduleKey: ModuleKey;
  moduleName: string;
  enabled: boolean;
};

export function AdminModuleToggle({ organizationId, moduleKey, moduleName, enabled }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="border-border flex items-center justify-between rounded-lg border px-4 py-3">
      <Label>{moduleName}</Label>
      <Button
        type="button"
        variant={enabled ? "default" : "outline"}
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(() =>
            toggleOrganizationModuleAction(organizationId, moduleKey, !enabled),
          )
        }
      >
        {enabled ? "Włączony" : "Wyłączony"}
      </Button>
    </div>
  );
}
