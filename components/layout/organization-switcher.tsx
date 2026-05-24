"use client";

import { useTransition } from "react";
import { Building2, ChevronDown } from "lucide-react";

import { switchOrganizationAction } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type OrgOption = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  organizations: OrgOption[];
  activeOrganizationId: string;
};

export function OrganizationSwitcher({ organizations, activeOrganizationId }: Props) {
  const [pending, startTransition] = useTransition();
  const active = organizations.find((o) => o.id === activeOrganizationId);

  if (organizations.length <= 1) {
    return (
      <span className="text-muted-foreground hidden items-center gap-1.5 text-sm md:inline-flex">
        <Building2 className="size-4" />
        {active?.name ?? "Organizacja"}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={pending}>
          <Building2 className="size-4" />
          <span className="max-w-[140px] truncate">{active?.name ?? "Organizacja"}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() =>
              startTransition(() => switchOrganizationAction(org.id))
            }
          >
            {org.name}
            {org.id === activeOrganizationId ? " ✓" : ""}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
