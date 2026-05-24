"use client";

import { buildSubscriptionDisplay, type SubscriptionSummary } from "@/lib/subscription-display";
import { cn } from "@/lib/utils";

const variantStyles = {
  active: {
    wrap: "border-emerald-500/25 bg-emerald-500/10",
    badge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
    detail: "text-emerald-900/80 dark:text-emerald-200/80",
  },
  expiring: {
    wrap: "border-amber-500/30 bg-amber-500/10",
    badge: "bg-amber-500/20 text-amber-900 dark:text-amber-200",
    detail: "text-amber-950/75 dark:text-amber-100/75",
  },
  expired: {
    wrap: "border-destructive/30 bg-destructive/10",
    badge: "bg-destructive/15 text-destructive",
    detail: "text-destructive/90",
  },
} as const;

type Props = {
  subscription: SubscriptionSummary;
  className?: string;
};

/** Kompaktowy podgląd planu i ważności subskrypcji (np. w menu profilu). */
export function SubscriptionStatus({ subscription, className }: Props) {
  const display = buildSubscriptionDisplay(subscription);
  const styles = variantStyles[display.variant];

  return (
    <div
      className={cn(
        "mt-2 rounded-lg border px-2.5 py-2",
        styles.wrap,
        className,
      )}
      role="status"
      aria-label={`${display.planLabel}. ${display.statusBadge}. ${display.validityLabel}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-foreground text-xs font-semibold tracking-tight">
          {display.planLabel}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none",
            styles.badge,
          )}
        >
          {display.statusBadge}
        </span>
      </div>
      <p className={cn("mt-1 text-[11px] leading-snug", styles.detail)}>
        {display.validityLabel}
      </p>
    </div>
  );
}
