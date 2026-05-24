import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { buildSubscriptionDisplay, type SubscriptionSummary } from "@/lib/subscription-display";
import { cn } from "@/lib/utils";

type Props = {
  subscription: SubscriptionSummary;
};

/** Krótki alert na pulpicie przy zbliżającym się wygaśnięciu lub po terminie. */
export function SubscriptionDashboardAlert({ subscription }: Props) {
  const display = buildSubscriptionDisplay(subscription);
  const days = subscription.daysRemaining;
  const show =
    subscription.isExpired ||
    display.variant === "expired" ||
    (days != null && days <= 14 && subscription.effectivePlan !== "free");

  if (!show) return null;

  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-2 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        subscription.isExpired
          ? "border-destructive/40 bg-destructive/10"
          : "border-amber-500/40 bg-amber-500/10",
      )}
      role="status"
    >
      <div className="flex gap-2">
        <AlertTriangle
          className={cn(
            "mt-0.5 size-4 shrink-0",
            subscription.isExpired ? "text-destructive" : "text-amber-600",
          )}
          aria-hidden
        />
        <div>
          <p className="font-medium">
            {subscription.isExpired
              ? "Subskrypcja wygasła — działasz w planie Free"
              : `${display.planLabel}: ${display.statusBadge}`}
          </p>
          <p className="text-muted-foreground mt-0.5">{display.validityLabel}</p>
        </div>
      </div>
      <Link
        href="/ustawienia/subskrypcja"
        className="text-primary shrink-0 text-sm font-medium hover:underline"
      >
        Zarządzaj subskrypcją →
      </Link>
    </div>
  );
}
