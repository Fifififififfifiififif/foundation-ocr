"use client";

import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { AlertTriangle, Check, Crown, X } from "lucide-react";

import { buildSubscriptionDisplay, type SubscriptionSummary } from "@/lib/subscription-display";
import { OrganizationVerifiedBadge } from "@/components/organization/organization-verified-badge";
import {
  PLAN_DEFINITIONS,
  PLAN_LIMIT_COMPARE_ROWS,
  SAAS_PLAN_IDS,
} from "@/src/modules/subscription/plans";
import type { SaasPlanId, SubscriptionFeatureFlag } from "@/src/modules/subscription/types";
import { formatLimitValue, formatUsageCap, limitsForUi, usageLabels } from "@/src/modules/subscription/format-limits";
import type { ModuleKey } from "@/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  subscription: SubscriptionSummary;
  usage?: {
    users: number;
    documentsThisMonth: number;
    ocrThisMonth: number;
    exportsThisMonth: number;
  };
  limits?: ReturnType<typeof limitsForUi>;
  showComparison?: boolean;
  /** Stan weryfikacji organizacji (nie jest wierszem w tabeli planów). */
  organizationRegistry?: {
    verifiedAt: Date | string | null;
    registryStatus: string | null;
    krs: string | null;
  };
  krsLookupEnabled?: boolean;
};

const variantStyles = {
  active: "border-emerald-500/30 bg-emerald-500/5",
  expiring: "border-amber-500/40 bg-amber-500/10",
  expired: "border-destructive/40 bg-destructive/10",
};

const BADGE_LABEL: Record<string, string> = {
  popular: "Popularny",
  enterprise: "Enterprise",
};

const PLAN_ACCENT: Partial<Record<SaasPlanId, string>> = {
  pro: "border-amber-500/50 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]",
  enterprise: "border-slate-400/40",
};

/** Uprawnienia planu (API / limity) — to nie to samo co moduły menu. */
const COMPARE_FEATURES: { key: SubscriptionFeatureFlag; label: string; hint?: string }[] = [
  { key: "invoice_ocr", label: "OCR faktur" },
  {
    key: "krs",
    label: "Lookup KRS / MF",
    hint: "Możliwość pobrania danych z rejestru (nie oznacza, że Twoja org. jest już zweryfikowana)",
  },
  { key: "export_csv", label: "Eksport CSV" },
  { key: "export_xlsx", label: "Eksport XLSX" },
  { key: "export_pdf", label: "Eksport PDF" },
  { key: "advanced_ocr", label: "Zaawansowany OCR" },
  { key: "approval_workflows", label: "Zatwierdzania" },
  { key: "accountant_pack", label: "Paczka księgowa" },
  { key: "api_access", label: "API" },
  { key: "bulk_processing", label: "Operacje zbiorcze" },
  { key: "integrations", label: "Integracje (KSeF)" },
  { key: "priority_support", label: "Wsparcie priorytetowe", hint: "Tylko Enterprise" },
];

/** Moduły widoczne w menu / bramkach API (bez AUTH, UPLOAD, PERMISSIONS). */
const COMPARE_MODULES: { key: ModuleKey; label: string }[] = [
  { key: "INVOICES", label: "Faktury" },
  { key: "DOCUMENTS", label: "Dokumenty" },
  { key: "USERS", label: "Użytkownicy" },
  { key: "SETTINGS", label: "Ustawienia" },
  { key: "BILLING", label: "Subskrypcja" },
  { key: "OCR", label: "OCR" },
  { key: "EXPORTS", label: "Eksporty" },
  { key: "CALENDAR", label: "Kalendarz" },
  { key: "PROJECTS", label: "Projekty" },
  { key: "ANALYTICS", label: "Analityka" },
  { key: "APPROVALS", label: "Zatwierdzenia" },
  { key: "AUDIT", label: "Audyt" },
  { key: "ACCOUNTING", label: "Księgowość" },
];

function planHasModule(planId: SaasPlanId, moduleKey: ModuleKey): boolean {
  return PLAN_DEFINITIONS[planId].modules.includes(moduleKey);
}

export function SubscriptionBillingPanel({
  subscription,
  usage,
  limits,
  showComparison = true,
  organizationRegistry,
  krsLookupEnabled = false,
}: Props) {
  const display = buildSubscriptionDisplay(subscription);
  const effective = (subscription.effectivePlan ?? subscription.plan) as SaasPlanId;
  const planDef = PLAN_DEFINITIONS[effective];
  const days = subscription.daysRemaining;
  const showWarning = days != null && days <= 14 && effective !== "free";

  const usageData = usage ?? {
    users: 0,
    documentsThisMonth: 0,
    ocrThisMonth: 0,
    exportsThisMonth: 0,
  };
  const limitData = limits ?? limitsForUi(planDef.limits);
  const labels = usageLabels();

  return (
    <div className="space-y-6">
      <Card className={cn("border-2", variantStyles[display.variant])}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Crown className="size-5 text-amber-500" aria-hidden />
              {display.planLabel}
            </CardTitle>
            <CardDescription className="mt-1">{planDef.tagline}</CardDescription>
            <p className="text-muted-foreground mt-2 text-sm">{display.validityLabel}</p>
          </div>
          <Badge
            variant={display.variant === "expired" ? "outline" : "secondary"}
            className={cn(
              "shrink-0",
              display.variant === "expired" && "border-destructive/50 text-destructive",
            )}
          >
            {display.statusBadge}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {showWarning ? (
            <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
              <p>
                {days === 0
                  ? "Subskrypcja wygasa dziś. Po terminie organizacja przejdzie na plan Free."
                  : `Pozostało ${days} ${days === 1 ? "dzień" : "dni"}. Po wygaśnięciu nastąpi automatyczny downgrade do Free.`}
              </p>
            </div>
          ) : null}

          {subscription.currentPeriodEnd ? (
            <p className="text-muted-foreground text-sm">
              Data odnowienia / wygaśnięcia:{" "}
              <span className="text-foreground font-medium">
                {format(new Date(subscription.currentPeriodEnd), "d MMMM yyyy", { locale: pl })}
              </span>
              {days != null ? ` (${days} dni)` : null}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <UsageRow
              label={labels.users}
              used={usageData.users}
              max={limitData.maxUsers}
            />
            <UsageRow
              label={labels.documents}
              used={usageData.documentsThisMonth}
              max={limitData.maxDocuments}
            />
            <UsageRow
              label={labels.ocr}
              used={usageData.ocrThisMonth}
              max={limitData.maxOcrJobsMonthly}
            />
            <UsageRow
              label={labels.exports}
              used={usageData.exportsThisMonth}
              max={limitData.maxExportsMonthly}
            />
          </div>

          <ul className="text-muted-foreground list-inside list-disc text-sm">
            {planDef.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>

          <p className="text-muted-foreground text-xs">
            Zmiana planu odbywa się przez administratora platformy lub przyszłą integrację płatności.
            Skontaktuj się z opiekunem, aby przejść na wyższy plan.
          </p>
        </CardContent>
      </Card>

      {showComparison ? (
        <PlanComparisonTable
          currentPlan={effective}
          organizationRegistry={organizationRegistry}
          krsLookupEnabled={krsLookupEnabled}
        />
      ) : null}
    </div>
  );
}

function PlanComparisonTable({
  currentPlan,
  organizationRegistry,
  krsLookupEnabled,
}: {
  currentPlan: SaasPlanId;
  organizationRegistry?: Props["organizationRegistry"];
  krsLookupEnabled?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Porównanie planów</CardTitle>
        <CardDescription>
          Poniżej dwie tabele: <strong>moduły</strong> (sekcje w aplikacji) oraz{" "}
          <strong>funkcje planu</strong> (uprawnienia API, m.in. lookup KRS). To nie jest ta sama lista.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {krsLookupEnabled ? (
          <div className="rounded-lg border border-dashed p-4 text-sm">
            <p className="font-medium">Weryfikacja Twojej organizacji w KRS</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Wiersz „Lookup KRS / MF” w tabeli oznacza, że plan pozwala <em>pobierać</em> dane z rejestru.
              Osobno w bazie zapisywana jest data weryfikacji — oznacza, że{" "}
              <em>Twoja</em> organizacja została dopasowana do oficjalnego odpisu KRS.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {organizationRegistry?.verifiedAt ? (
                <OrganizationVerifiedBadge
                  verifiedAt={organizationRegistry.verifiedAt}
                  registryStatus={organizationRegistry.registryStatus}
                />
              ) : (
                <Badge variant="outline" className="text-muted-foreground font-normal">
                  Brak weryfikacji KRS
                </Badge>
              )}
              {organizationRegistry?.krs ? (
                <span className="text-muted-foreground text-xs">KRS: {organizationRegistry.krs}</span>
              ) : null}
            </div>
            {!organizationRegistry?.verifiedAt ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Ustawienia → Organizacja → „Pobierz dane organizacji” (wymagany numer KRS w odpisie, nie sam NIP).
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-3">
          {SAAS_PLAN_IDS.map((id) => (
            <PlanTierCard key={id} planId={id} isCurrent={id === currentPlan} />
          ))}
        </div>

        <ComparisonMatrix
          title="Limity planu"
          caption="Miesięczne limity i pojemność magazynu — zgodnie z aktywnym planem."
          rows={PLAN_LIMIT_COMPARE_ROWS.map(({ key, label }) => ({
            key,
            label,
            value: (id) => formatLimitValue(key, PLAN_DEFINITIONS[id].limits[key]),
          }))}
          mode="value"
        />

        <ComparisonMatrix
          title="Moduły w aplikacji"
          caption={`${COMPARE_MODULES.length} modułów menu / API (z ${COMPARE_MODULES.length + 3} w platformie — AUTH, UPLOAD i PERMISSIONS są zawsze włączone w tle).`}
          rows={COMPARE_MODULES.map(({ key, label }) => ({
            key,
            label,
            has: (id) => planHasModule(id, key),
          }))}
        />

        <ComparisonMatrix
          title="Funkcje planu"
          caption={`${COMPARE_FEATURES.length} uprawnień (OCR pipeline, eksporty, lookup rejestrów, API…).`}
          rows={COMPARE_FEATURES.map(({ key, label, hint }) => ({
            key,
            label,
            hint,
            has: (id) => PLAN_DEFINITIONS[id].features[key],
          }))}
        />
      </CardContent>
    </Card>
  );
}

function ComparisonMatrix({
  title,
  caption,
  rows,
  mode = "check",
}: {
  title: string;
  caption: string;
  mode?: "check" | "value";
  rows: {
    key: string;
    label: string;
    hint?: string;
    has?: (planId: SaasPlanId) => boolean;
    value?: (planId: SaasPlanId) => string;
  }[];
}) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-muted-foreground text-xs">{caption}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 pr-4 font-medium">Pozycja</th>
              {SAAS_PLAN_IDS.map((id) => (
                <th key={id} className="px-2 pb-2 text-center font-medium">
                  {PLAN_DEFINITIONS[id].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label, hint, has, value }) => (
              <tr key={key} className="border-border/50 border-b">
                <td className="py-2 pr-4">
                  <span>{label}</span>
                  {hint ? (
                    <span className="text-muted-foreground mt-0.5 block text-[10px] leading-snug">
                      {hint}
                    </span>
                  ) : null}
                </td>
                {SAAS_PLAN_IDS.map((id) => (
                  <td key={id} className="px-2 py-2 text-center tabular-nums">
                    {mode === "value" && value ? (
                      <span className="text-sm font-medium">{value(id)}</span>
                    ) : has?.(id) ? (
                      <Check className="mx-auto size-4 text-emerald-600" aria-label="Tak" />
                    ) : (
                      <X className="text-muted-foreground/50 mx-auto size-4" aria-label="Nie" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanTierCard({ planId, isCurrent }: { planId: SaasPlanId; isCurrent: boolean }) {
  const p = PLAN_DEFINITIONS[planId];
  const accent = PLAN_ACCENT[planId];

  return (
    <article
      className={cn(
        "bg-card flex h-full min-w-0 flex-col rounded-xl border p-3 shadow-sm",
        accent,
        isCurrent && "border-primary bg-primary/[0.06] ring-2 ring-primary/25",
      )}
    >
      <div className="mb-1.5 min-h-[1.125rem]">
        {p.badge ? (
          <Badge
            variant="secondary"
            className={cn(
              "h-5 px-1.5 text-[9px] font-medium",
              p.badge === "popular" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
              p.badge === "enterprise" && "bg-slate-500/15",
            )}
          >
            {BADGE_LABEL[p.badge] ?? p.badge}
          </Badge>
        ) : (
          <span className="invisible inline-block h-5 text-[9px]" aria-hidden>
            —
          </span>
        )}
      </div>

      <h3 className="text-sm font-semibold leading-tight">{p.label}</h3>
      <p className="text-muted-foreground mt-1 flex-1 text-[11px] leading-[1.45]">
        {p.tagline}
      </p>

      <dl className="bg-muted/40 mt-2 space-y-1 rounded-md border border-border/60 p-2 text-[10px]">
        {PLAN_LIMIT_COMPARE_ROWS.map(({ key, label }) => (
          <PlanStatRow
            key={key}
            label={label}
            value={formatLimitValue(key, p.limits[key])}
          />
        ))}
      </dl>

      <div className="mt-2 min-h-[1.375rem]">
        {isCurrent ? (
          <Badge className="h-5 w-full justify-center px-1 text-[9px]" variant="default">
            Twój plan
          </Badge>
        ) : (
          <span className="invisible block h-5 text-[9px]" aria-hidden>
            —
          </span>
        )}
      </div>
    </article>
  );
}

function PlanStatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-1.5">
      <dt className="text-muted-foreground min-w-0 truncate leading-none">{label}</dt>
      <dd className="shrink-0 font-semibold tabular-nums leading-none">{value}</dd>
    </div>
  );
}

function UsageRow({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const hot = max > 0 && used >= max * 0.9;
  return (
    <div className="rounded-lg border p-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium", hot && "text-amber-600")}>
          {formatUsageCap(used, max)}
        </span>
      </div>
      {max > 0 ? (
        <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
          <div
            className={cn("h-full rounded-full", hot ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
