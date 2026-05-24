"use client";

import { LifeBuoy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildSupportMailtoUrl } from "@/lib/support-config";
import { cn } from "@/lib/utils";

const topbarIconButton = cn(
  "text-sidebar-foreground/80 relative shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent",
);

type Props = {
  mailtoUrl?: string;
};

export function SupportMenu({ mailtoUrl }: Props) {
  const href = mailtoUrl ?? buildSupportMailtoUrl();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={topbarIconButton}
          aria-label="Pomoc i wsparcie"
        >
          <LifeBuoy className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          Wsparcie
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={href} className="cursor-pointer">
            Skontaktuj się z konsultantem
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
