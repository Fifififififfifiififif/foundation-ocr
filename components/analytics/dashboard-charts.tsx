"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoneyPl } from "@/lib/format/money";
import { cn } from "@/lib/utils";

const STATUS_COLORS = ["#71717a", "#f59e0b", "#10b981"] as const;
const BUDGET_BAR = "#64748b";
const SPENT_ON_BUDGET = "var(--color-primary, #18181b)";
const SPENT_WARN = "#ca8a04";
const SPENT_OVER_BUDGET = "#ef4444";
const OCR_YES = "var(--color-primary, #18181b)";
const OCR_NO = "#a1a1aa";

function fmtMonthShort(ym: string): string {
  try {
    return format(parseISO(`${ym}-01`), "LLL ''yy", { locale: pl });
  } catch {
    return ym;
  }
}

function compactPl(n: number): string {
  return new Intl.NumberFormat("pl-PL", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

const tooltipBox =
  "rounded-md border border-border/60 bg-popover/95 px-2.5 py-1.5 text-popover-foreground shadow-sm text-[11px] leading-relaxed backdrop-blur-sm";

const projectTooltipBox =
  "max-w-[14rem] rounded border border-border/50 bg-zinc-950/92 px-2 py-1 text-[10px] leading-snug text-zinc-300 shadow-sm dark:bg-zinc-950/95";

type TooltipPayload = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

function ChartTooltip({
  active,
  label,
  payload,
  formatter,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayload[];
  formatter?: (item: TooltipPayload) => React.ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={tooltipBox}>
      {label ? <p className="text-muted-foreground mb-1.5 text-[11px] font-medium">{label}</p> : null}
      <ul className="flex flex-col gap-1">
        {payload.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color ?? "currentColor" }}
            />
            <span className="flex-1">{formatter ? formatter(item) : `${item.name}: ${item.value}`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-muted-foreground flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint ? <p className="max-w-xs text-xs leading-relaxed">{hint}</p> : null}
    </div>
  );
}

export type OcrMonthRow = {
  month: string;
  total: number;
  withOcr: number;
  withoutOcr: number;
  rate: number;
};

export type DashboardChartsProps = {
  monthlySpend: { month: string; brutto: number }[];
  ocrActivity: OcrMonthRow[];
  statusData: { name: string; value: number }[];
  contractorSpend: { name: string; brutto: number }[];
  projectUsage: { name: string; fullName: string; budget: number; spent: number }[];
  kpiSpendTotal: number;
  kpiOcrCount: number;
  kpiDocumentCount: number;
};

export function DashboardCharts({
  monthlySpend,
  ocrActivity,
  statusData,
  contractorSpend,
  projectUsage,
  kpiSpendTotal,
  kpiOcrCount,
  kpiDocumentCount,
}: DashboardChartsProps) {
  const safeStatusData = statusData ?? [];
  const safeContractorSpend = contractorSpend ?? [];

  const safeKpiSpendTotal = kpiSpendTotal ?? 0;
  const safeKpiOcrCount = kpiOcrCount ?? 0;
  const safeKpiDocumentCount = kpiDocumentCount ?? 0;

  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const spendSorted = React.useMemo(
    () => [...(monthlySpend ?? [])].sort((a, b) => a.month.localeCompare(b.month)),
    [monthlySpend],
  );

  const spendLineData = React.useMemo(
    () => spendSorted.map((d) => ({ ...d, label: fmtMonthShort(d.month) })),
    [spendSorted],
  );

  const mom = React.useMemo(() => {
    if (spendSorted.length < 2) return null;
    const prev = spendSorted[spendSorted.length - 2];
    const last = spendSorted[spendSorted.length - 1];
    const emerging = prev.brutto <= 0 && last.brutto > 0;
    const pct = prev.brutto > 0 ? ((last.brutto - prev.brutto) / prev.brutto) * 100 : null;
    return { prev, last, pct, emerging };
  }, [spendSorted]);

  const sum12 = React.useMemo(
    () => Math.round(spendSorted.reduce((s, d) => s + d.brutto, 0) * 100) / 100,
    [spendSorted],
  );

  const ocrChartData = React.useMemo(
    () =>
      (ocrActivity ?? []).map((d) => ({
        ...d,
        label: fmtMonthShort(d.month),
      })),
    [ocrActivity],
  );

  const statusHasData = safeStatusData.some((d) => d.value > 0);

  const projectRowsSorted = React.useMemo(
    () =>
      [...(projectUsage ?? [])].sort(
        (a, b) => Math.max(b.spent, b.budget) - Math.max(a.spent, a.budget),
      ),
    [projectUsage],
  );

  const gridWrap = "transition-opacity duration-300 ease-out";
  const gridClass = cn(gridWrap, !ready && "opacity-0", ready && "opacity-100");

  return (
    <div className={cn("grid gap-6 lg:grid-cols-2", gridClass)}>
      {!ready ? (
        <>
          <Skeleton className="h-[360px] rounded-xl lg:col-span-2" />
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl lg:col-span-2" />
          <Skeleton className="h-[320px] rounded-xl lg:col-span-2" />
        </>
      ) : (
        <>
          <Card className="border-border/70 shadow-sm transition-shadow duration-200 hover:shadow-md lg:col-span-2">
            <CardHeader className="gap-2 pb-2 sm:flex sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold tracking-tight">Wydatki wg miesiąca</CardTitle>
                <CardDescription className="text-xs leading-relaxed sm:text-sm">
                  Suma kwot brutto z datą wystawienia (12 miesięcy). Na pulpicie:{" "}
                  <span className="text-foreground font-medium tabular-nums">{formatMoneyPl(safeKpiSpendTotal)}</span>{" "}
                  łącznie w bazie · {safeKpiDocumentCount} dokumentów · {safeKpiOcrCount} z OCR.
                </CardDescription>
              </div>
              <CardAction className="flex flex-col items-stretch gap-2 sm:items-end">
                <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs">
                  <span className="text-muted-foreground shrink-0 font-medium">Suma 12 mc-y:</span>
                  <span className="font-semibold tabular-nums">{formatMoneyPl(sum12)}</span>
                </div>
                {mom ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      vs {fmtMonthShort(mom.prev.month)} → {fmtMonthShort(mom.last.month)}:
                    </span>
                    {mom.emerging ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Pierwsze wydatki w okresie
                      </span>
                    ) : mom.pct == null ? (
                      <span className="text-muted-foreground inline-flex items-center gap-0.5 font-medium">
                        <Minus className="size-3.5" />
                        bez zmian
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 font-semibold tabular-nums",
                          mom.pct > 0.5
                            ? "text-emerald-600 dark:text-emerald-400"
                            : mom.pct < -0.5
                              ? "text-destructive"
                              : "text-muted-foreground",
                        )}
                      >
                        {mom.pct > 0.5 ? (
                          <ArrowUpRight className="size-3.5" />
                        ) : mom.pct < -0.5 ? (
                          <ArrowDownRight className="size-3.5" />
                        ) : (
                          <Minus className="size-3.5" />
                        )}
                        {mom.pct > 0 ? "+" : ""}
                        {mom.pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                ) : null}
                <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1" asChild>
                  <Link href="/raporty">
                    Raporty
                    <ArrowRight className="size-3.5 opacity-70" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="h-[min(360px,55vw)] min-h-[240px] w-full pt-0">
              {spendLineData.length === 0 ? (
                <ChartEmpty
                  title="Brak danych o wydatkach"
                  hint="Dodaj faktury z datą wystawienia, aby zobaczyć trend w czasie."
                />
              ) : (
                <ResponsiveContainer width="100%" height={280} minWidth={0}>
                  <LineChart data={spendLineData} margin={{ left: 0, right: 8, top: 12, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/80" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      dy={6}
                    />
                    <YAxis
                      width={44}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${compactPl(Number(v))} zł`}
                    />
                    <Tooltip
                      cursor={{ stroke: "color-mix(in oklab, var(--color-primary) 35%, transparent)", strokeWidth: 1 }}
                      content={({ active, label, payload }) => {
                        const row = (payload ?? []).find((p) => p.dataKey === "brutto");
                        if (!active || !row) return null;
                        return (
                          <div className={tooltipBox}>
                            <p className="text-muted-foreground mb-1 text-[11px] font-medium">{label}</p>
                            <p className="tabular-nums">
                              Suma brutto:{" "}
                              <span className="text-foreground font-semibold">
                                {formatMoneyPl(Number(row.value))}
                              </span>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="brutto"
                      name="Wydatki brutto"
                      stroke="var(--color-primary)"
                      strokeWidth={2.5}
                      dot={{ r: 3, strokeWidth: 2, fill: "var(--color-card)" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:col-span-2 lg:grid-cols-2">
            <Card className="border-border/70 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold tracking-tight">Status faktur</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Udział dokumentów według statusu weryfikacji.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[min(300px,70vw)] min-h-[220px] pt-0">
                {!statusHasData ? (
                  <ChartEmpty title="Brak dokumentów" hint="Po dodaniu faktur zobaczysz rozkład statusów." />
                ) : (
                  <ResponsiveContainer width="100%" height={240} minWidth={0}>
                    <PieChart>
                      <Pie
                        data={safeStatusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="48%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={2}
                        stroke="var(--color-card)"
                        strokeWidth={2}
                      >
                        {safeStatusData.map((_, i) => (
                          <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => (
                          <ChartTooltip
                            active={active}
                            payload={payload as unknown as TooltipPayload[]}
                            formatter={(item) => (
                              <span>
                                {item.name}:{" "}
                                <span className="text-foreground font-semibold">{Number(item.value)}</span> szt.
                              </span>
                            )}
                          />
                        )}
                      />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold tracking-tight">Kontrahenci — top 8</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Suma kwot brutto z przypisanych faktur.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[min(300px,70vw)] min-h-[220px] pt-0">
                {safeContractorSpend.length === 0 ? (
                  <ChartEmpty title="Brak danych" hint="Przypisz kontrahentów do faktur, aby zobaczyć ranking." />
                ) : (
                  <ResponsiveContainer width="100%" height={240} minWidth={0}>
                    <BarChart
                      data={safeContractorSpend}
                      layout="vertical"
                      margin={{ left: 4, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/80" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${compactPl(Number(v))} zł`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={108}
                        tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={false}
                        content={({ active, payload }) => {
                          const row = payload?.[0]?.payload as
                            | NonNullable<DashboardChartsProps["contractorSpend"]>[number]
                            | undefined;
                          if (!active || !row) return null;
                          return (
                            <div className={tooltipBox}>
                              <p className="text-foreground mb-1 text-[11px] font-semibold">{row.name}</p>
                              <p className="tabular-nums">
                                Suma brutto:{" "}
                                <span className="font-semibold">{formatMoneyPl(Number(row.brutto))}</span>
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="brutto" name="Suma brutto" radius={[0, 6, 6, 0]} barSize={14}>
                        {safeContractorSpend.map((_, i) => (
                          <Cell key={i} fill="var(--color-primary)" fillOpacity={1 - i * 0.09} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 shadow-sm transition-shadow duration-200 hover:shadow-md lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold tracking-tight">Aktywność OCR wg miesiąca</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Liczba faktur z datą wystawienia w miesiącu — podział na przetworzone OCR i pozostałe.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[min(300px,55vw)] min-h-[220px] pt-0">
              {ocrChartData.length === 0 ? (
                <ChartEmpty title="Brak danych OCR" hint="Uruchom OCR na dokumentach, aby zobaczyć trend przetwarzania." />
              ) : (
                <ResponsiveContainer width="100%" height={280} minWidth={0}>
                  <BarChart data={ocrChartData} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/80" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      dy={6}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={36}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={false}
                      content={({ active, label, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload as (OcrMonthRow & { label: string }) | undefined;
                        if (!row) return null;
                        return (
                          <div className={tooltipBox}>
                            <p className="text-muted-foreground mb-1.5 text-[11px] font-medium">{label}</p>
                            <p className="tabular-nums">
                              Z OCR:{" "}
                              <span className="text-foreground font-semibold">{row.withOcr}</span> · bez OCR:{" "}
                              <span className="text-foreground font-semibold">{row.withoutOcr}</span>
                            </p>
                            <p className="text-muted-foreground mt-1 text-[11px]">
                              Udział OCR w miesiącu:{" "}
                              <span className="text-foreground font-medium">{row.rate}%</span>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                    <Bar dataKey="withOcr" name="Z OCR" stackId="ocr" fill={OCR_YES} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="withoutOcr" name="Bez OCR" stackId="ocr" fill={OCR_NO} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm transition-shadow duration-200 hover:shadow-md lg:col-span-2">
            <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold tracking-tight">Projekty — budżet i wydatki</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Porównanie sumy brutto z faktur z deklarowanym budżetem (jeśli ustawiony). W podpowiedzi pełna nazwa
                  projektu. Kolor „Wydano” zależy od wykorzystania budżetu: ostrzeżenie od 90%, czerwony po
                  przekroczeniu.
                </CardDescription>
              </div>
              <CardAction>
                <Button variant="outline" size="sm" className="h-8" asChild>
                  <Link href="/projects">Projekty</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-0">
              {(projectUsage ?? []).length === 0 ? (
                <ChartEmpty title="Brak projektów" hint="Utwórz projekt i przypisz do niego faktury." />
              ) : (
                <>
                  <div className="text-muted-foreground mb-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: BUDGET_BAR }}
                        aria-hidden
                      />
                      Budżet
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5" aria-hidden>
                        <span className="size-2 rounded-sm bg-primary" />
                        <span className="size-2 rounded-sm" style={{ backgroundColor: SPENT_WARN }} />
                        <span className="size-2 rounded-sm" style={{ backgroundColor: SPENT_OVER_BUDGET }} />
                      </span>
                      <span>
                        Wydano: &lt;90% · ≥90% · nad budżetem
                      </span>
                    </span>
                  </div>
                  <div
                    className="w-full"
                    style={{
                      height: Math.min(520, Math.max(260, projectRowsSorted.length * 36 + 100)),
                    }}
                  >
                    <ResponsiveContainer width="100%" height={240} minWidth={0}>
                      <BarChart
                        layout="vertical"
                        data={projectRowsSorted}
                        margin={{ left: 4, right: 12, top: 4, bottom: 8 }}
                        barCategoryGap={12}
                        barGap={4}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/80" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${compactPl(Number(v))} zł`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={148}
                          tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                        />
                        <Tooltip
                          cursor={false}
                          content={({ active, label, payload }) => {
                            if (!active || !payload?.length) return null;
                            const row = payload[0]?.payload as
                              | DashboardChartsProps["projectUsage"][number]
                              | undefined;
                            if (!row) return null;
                            const spent = row.spent ?? 0;
                            const budget = row.budget ?? 0;
                            const pct =
                              budget > 0 ? Math.min(999, Math.round((spent / budget) * 100)) : null;
                            return (
                              <div className={projectTooltipBox}>
                                {row.fullName ? (
                                  <p className="mb-0.5 text-[10px] font-medium leading-tight text-zinc-400">
                                    {row.fullName}
                                  </p>
                                ) : (
                                  <p className="mb-0.5 text-[10px] font-medium leading-tight text-zinc-500">
                                    {label}
                                  </p>
                                )}
                                <p className="tabular-nums text-zinc-500">
                                  Wydano:{" "}
                                  <span className="font-medium text-zinc-200">{formatMoneyPl(spent)}</span>
                                </p>
                                <p className="mt-0.5 text-[10px] tabular-nums text-zinc-600">
                                  Budżet: {budget > 0 ? formatMoneyPl(budget) : "—"}
                                  {pct != null ? (
                                    <>
                                      {" "}
                                      · <span className="text-zinc-500">{pct}%</span>
                                    </>
                                  ) : null}
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="budget" name="Budżet" fill={BUDGET_BAR} radius={[0, 4, 4, 0]} barSize={9}>
                          {projectRowsSorted.map((entry, i) => (
                            <Cell
                              key={`budget-${i}`}
                              fill={
                                entry.budget > 0
                                  ? BUDGET_BAR
                                  : "color-mix(in oklab, var(--color-muted-foreground) 28%, transparent)"
                              }
                            />
                          ))}
                        </Bar>
                        <Bar dataKey="spent" name="Wydano (brutto)" radius={[0, 4, 4, 0]} barSize={9}>
                          {projectRowsSorted.map((entry, i) => {
                            const b = entry.budget ?? 0;
                            const s = entry.spent ?? 0;
                            let fill = SPENT_ON_BUDGET;
                            if (b > 0) {
                              if (s > b) fill = SPENT_OVER_BUDGET;
                              else if (s >= b * 0.9) fill = SPENT_WARN;
                            }
                            return <Cell key={`spent-${i}`} fill={fill} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
