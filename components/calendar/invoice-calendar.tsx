"use client";

import * as React from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InvoiceCalendarContext } from "@/components/calendar/calendar-context";
import {
  CalendarFilters,
  type CalendarFilterState,
} from "@/components/calendar/calendar-filters";
import { InvoiceDayDialog } from "@/components/calendar/invoice-dialog";
import { InvoiceDayButton } from "@/components/calendar/invoice-day-button";
import {
  buildInvoicesByDay,
  dayKey,
  isOverdue,
  statusDotClass,
  type CalendarInvoice,
} from "@/components/calendar/calendar-utils";
import { formatMoneyPl } from "@/lib/format/money";
import { documentStatusPl } from "@/lib/ui-i18n";
import { cn } from "@/lib/utils";

const CALENDAR_YEAR_MIN = 2020;
const CALENDAR_YEAR_MAX = 2035;
const MONTH_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

type Opt = { id: string; name: string };

type Props = {
  projects: Opt[];
  contractors: Opt[];
  /** "page" = pełna szerokość i pasek narzędzi jak widok dedykowany. */
  variant?: "embedded" | "page";
};

const emptyFilters: CalendarFilterState = {
  contractorId: "",
  projectId: "",
  noContractor: false,
  noProject: false,
  status: "",
  ocr: "",
  issueFrom: "",
  issueTo: "",
  minGross: "",
  maxGross: "",
  overdueOnly: false,
};

function HiddenMonthCaption() {
  return <span className="hidden" aria-hidden />;
}

export function InvoiceCalendar({ projects, contractors, variant = "embedded" }: Props) {
  const [viewMode, setViewMode] = React.useState<"month" | "week" | "day">("month");
  const [displayMonth, setDisplayMonth] = React.useState(() => startOfMonth(new Date()));
  const [weekAnchor, setWeekAnchor] = React.useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [dayAnchor, setDayAnchor] = React.useState(() => {
    const n = new Date();
    n.setHours(12, 0, 0, 0);
    return n;
  });
  const [selected, setSelected] = React.useState<Date | undefined>(undefined);
  const [filters, setFilters] = React.useState<CalendarFilterState>(emptyFilters);
  const [invoices, setInvoices] = React.useState<CalendarInvoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogDate, setDialogDate] = React.useState<Date | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [monthJumpOpen, setMonthJumpOpen] = React.useState(false);
  const [jumpYear, setJumpYear] = React.useState(() => displayMonth.getFullYear());

  const yearOptions = React.useMemo(
    () =>
      Array.from({ length: CALENDAR_YEAR_MAX - CALENDAR_YEAR_MIN + 1 }, (_, i) => CALENDAR_YEAR_MIN + i),
    [],
  );

  React.useEffect(() => {
    if (monthJumpOpen) setJumpYear(displayMonth.getFullYear());
  }, [monthJumpOpen, displayMonth]);

  const range = React.useMemo(() => {
    if (viewMode === "month") {
      return {
        start: startOfMonth(displayMonth),
        end: endOfMonth(displayMonth),
      };
    }
    if (viewMode === "week") {
      return {
        start: startOfWeek(weekAnchor, { weekStartsOn: 1 }),
        end: endOfWeek(weekAnchor, { weekStartsOn: 1 }),
      };
    }
    const d = new Date(dayAnchor);
    d.setHours(12, 0, 0, 0);
    return { start: d, end: d };
  }, [viewMode, displayMonth, weekAnchor, dayAnchor]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("from", format(range.start, "yyyy-MM-dd"));
      params.set("to", format(range.end, "yyyy-MM-dd"));
      if (filters.contractorId) params.set("contractorId", filters.contractorId);
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.noContractor) params.set("noContractor", "1");
      if (filters.noProject) params.set("noProject", "1");
      if (filters.status) params.set("status", filters.status);
      if (filters.ocr) params.set("ocr", filters.ocr);
      if (filters.minGross) params.set("minGross", filters.minGross);
      if (filters.maxGross) params.set("maxGross", filters.maxGross);
      if (filters.issueFrom) params.set("issueFrom", filters.issueFrom);
      if (filters.issueTo) params.set("issueTo", filters.issueTo);
      if (filters.overdueOnly) params.set("overdueOnly", "1");
      try {
        const res = await fetch(`/api/documents/calendar?${params}`, { credentials: "include" });
        if (!res.ok) throw new Error("fetch");
        const data = (await res.json()) as { invoices: CalendarInvoice[] };
        if (!cancelled) setInvoices(data.invoices);
      } catch {
        if (!cancelled) setInvoices([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [range.start, range.end, filters, reloadToken]);

  const invoicesByDay = React.useMemo(() => buildInvoicesByDay(invoices), [invoices]);

  const today = React.useMemo(() => {
    const t = new Date();
    t.setHours(12, 0, 0, 0);
    return t;
  }, []);

  const onDayOpen = React.useCallback((d: Date) => {
    setSelected(d);
    setDialogDate(d);
    setDialogOpen(true);
  }, []);

  const ctx = React.useMemo(
    () => ({
      invoicesByDay,
      onDayOpen,
      today,
    }),
    [invoicesByDay, onDayOpen, today],
  );

  const calendarComponents = React.useMemo(
    () => ({
      DayButton: InvoiceDayButton,
      MonthCaption: HiddenMonthCaption,
    }),
    [],
  );

  const weekDays = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(weekAnchor, { weekStartsOn: 1 }),
        end: endOfWeek(weekAnchor, { weekStartsOn: 1 }),
      }),
    [weekAnchor],
  );

  const dialogInvoices = dialogDate ? (invoicesByDay.get(dayKey(dialogDate)) ?? []) : [];

  const monthLabel = format(displayMonth, "LLLL yyyy", { locale: pl });
  const weekLabel = `${format(weekDays[0], "d MMM", { locale: pl })} – ${format(
    weekDays[6],
    "d MMM yyyy",
    { locale: pl },
  )}`;
  const dayLabel = format(dayAnchor, "EEEE, d MMMM yyyy", { locale: pl });

  const filterActiveCount = React.useMemo(() => {
    let n = 0;
    if (filters.contractorId) n++;
    if (filters.projectId) n++;
    if (filters.noContractor) n++;
    if (filters.noProject) n++;
    if (filters.status) n++;
    if (filters.ocr) n++;
    if (filters.issueFrom) n++;
    if (filters.issueTo) n++;
    if (filters.minGross) n++;
    if (filters.maxGross) n++;
    if (filters.overdueOnly) n++;
    return n;
  }, [filters]);

  const goToday = React.useCallback(() => {
    const n = new Date();
    n.setHours(12, 0, 0, 0);
    setDisplayMonth(startOfMonth(n));
    setWeekAnchor(startOfWeek(n, { weekStartsOn: 1 }));
    setDayAnchor(n);
    setSelected(n);
  }, []);

  const dayList = invoicesByDay.get(dayKey(dayAnchor)) ?? [];

  const outerClass =
    variant === "page"
      ? "flex w-full min-w-0 flex-col gap-6 md:gap-8"
      : "flex w-full min-w-0 flex-col gap-6 md:gap-8";

  return (
    <TooltipProvider delayDuration={250}>
      <InvoiceCalendarContext.Provider value={ctx}>
        <div className={outerClass}>
          <div
            className={cn(
              "flex flex-col gap-4 pb-1 md:gap-5",
              variant === "page" ? "lg:flex-row lg:flex-wrap lg:items-center lg:justify-between" : "sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
            )}
          >
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <Button type="button" variant="outline" size="sm" className="h-9 min-w-[5.5rem]" onClick={goToday}>
                Dzisiaj
              </Button>

              {viewMode === "month" ? (
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => setDisplayMonth((m) => subMonths(m, 1))}
                    aria-label="Poprzedni miesiąc"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Popover open={monthJumpOpen} onOpenChange={setMonthJumpOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "text-foreground hover:bg-muted/70 focus-visible:ring-ring min-w-[9.5rem] rounded-lg border border-transparent px-3 py-1.5 text-center text-sm font-semibold capitalize tabular-nums transition-colors",
                          "focus-visible:ring-2 focus-visible:outline-none dark:hover:bg-white/10",
                        )}
                        aria-expanded={monthJumpOpen}
                        aria-haspopup="dialog"
                        aria-label={`Zmień miesiąc, wyświetlany: ${monthLabel}`}
                      >
                        {monthLabel}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="center"
                      sideOffset={10}
                      className="border-border/80 bg-popover text-popover-foreground w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border p-4 shadow-xl dark:border-white/30"
                    >
                      <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wide uppercase">
                        Rok i miesiąc
                      </p>
                      <div className="mb-4 space-y-2">
                        <Label htmlFor="cal-jump-year" className="text-xs">
                          Rok
                        </Label>
                        <Select value={String(jumpYear)} onValueChange={(v) => setJumpYear(parseInt(v, 10))}>
                          <SelectTrigger id="cal-jump-year" className="h-10 w-full bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {yearOptions.map((y) => (
                              <SelectItem key={y} value={String(y)}>
                                {y}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
                        Miesiąc
                      </p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {MONTH_INDICES.map((m) => {
                          const active =
                            jumpYear === displayMonth.getFullYear() && m === displayMonth.getMonth();
                          return (
                            <Button
                              key={m}
                              type="button"
                              variant={active ? "default" : "secondary"}
                              size="sm"
                              className="h-9 text-xs font-semibold capitalize"
                              onClick={() => {
                                const next = startOfMonth(new Date(jumpYear, m, 1, 12, 0, 0, 0));
                                setDisplayMonth(next);
                                setMonthJumpOpen(false);
                              }}
                            >
                              {format(new Date(2024, m, 1), "LLL", { locale: pl })}
                            </Button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => setDisplayMonth((m) => addMonths(m, 1))}
                    aria-label="Następny miesiąc"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : null}

              <div className="bg-muted/60 inline-flex rounded-lg p-1.5 ring-1 ring-border/60">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "month" ? "default" : "ghost"}
                  className="h-8 rounded-md px-3 shadow-none sm:px-4"
                  onClick={() => {
                    setViewMode("month");
                    setDisplayMonth(startOfMonth(viewMode === "day" ? dayAnchor : displayMonth));
                  }}
                >
                  Miesiąc
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "week" ? "default" : "ghost"}
                  className="h-8 rounded-md px-3 shadow-none sm:px-4"
                  onClick={() => {
                    setViewMode("week");
                    const base = selected ?? dayAnchor ?? new Date();
                    setWeekAnchor(startOfWeek(base, { weekStartsOn: 1 }));
                  }}
                >
                  Tydzień
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "day" ? "default" : "ghost"}
                  className="h-8 rounded-md px-3 shadow-none sm:px-4"
                  onClick={() => {
                    setViewMode("day");
                    const base = selected ?? dayAnchor ?? new Date();
                    const d = new Date(base);
                    d.setHours(12, 0, 0, 0);
                    setDayAnchor(d);
                    setDisplayMonth(startOfMonth(d));
                  }}
                >
                  Dzień
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 md:gap-4">
              {viewMode === "week" ? (
                <p className="text-muted-foreground text-sm font-medium capitalize">{weekLabel}</p>
              ) : null}
              {viewMode === "day" ? (
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    onClick={() =>
                      setDayAnchor((d) => {
                        const n = subDays(d, 1);
                        n.setHours(12, 0, 0, 0);
                        setDisplayMonth(startOfMonth(n));
                        return n;
                      })
                    }
                    aria-label="Poprzedni dzień"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-muted-foreground max-w-[14rem] truncate px-2 text-center text-sm font-medium capitalize sm:max-w-xs md:px-3">
                    {dayLabel}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    onClick={() =>
                      setDayAnchor((d) => {
                        const n = addDays(d, 1);
                        n.setHours(12, 0, 0, 0);
                        setDisplayMonth(startOfMonth(n));
                        return n;
                      })
                    }
                    aria-label="Następny dzień"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : null}

              {variant === "page" ? (
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-9 gap-2">
                      <Filter className="size-4 opacity-80" />
                      Filtry
                      {filterActiveCount > 0 ? (
                        <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1 text-[10px] font-semibold">
                          {filterActiveCount}
                        </Badge>
                      ) : null}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="flex w-full flex-col gap-0 overflow-y-auto border-l border-border p-6 sm:max-w-xl sm:p-8 md:max-w-[28rem] dark:border-l-white/35"
                  >
                    <SheetHeader className="mb-6 shrink-0 space-y-2 pr-10 text-left">
                      <SheetTitle>Filtry kalendarza</SheetTitle>
                      <SheetDescription>Zmiana filtrów odświeża dane automatycznie.</SheetDescription>
                    </SheetHeader>
                    <CalendarFilters
                      projects={projects}
                      contractors={contractors}
                      value={filters}
                      onChange={setFilters}
                      variant="sheet"
                    />
                  </SheetContent>
                </Sheet>
              ) : null}
            </div>
          </div>

          {variant === "embedded" ? (
            <CalendarFilters
              projects={projects}
              contractors={contractors}
              value={filters}
              onChange={setFilters}
              variant="card"
            />
          ) : null}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 md:py-20">
              <Skeleton className={cn("h-80 w-full rounded-xl", variant === "page" ? "max-w-none" : "max-w-md")} />
              <p className="text-muted-foreground text-xs">Ładowanie faktur…</p>
            </div>
          ) : viewMode === "month" ? (
            <div className="w-full min-w-0">
              <Calendar
                mode="single"
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                selected={selected}
                onSelect={setSelected}
                captionLayout="label"
                hideNavigation
                startMonth={new Date(2020, 0, 1)}
                endMonth={new Date(2035, 11, 31)}
                showOutsideDays
                fixedWeeks
                className="invoice-rdp w-full max-w-none border-0 bg-transparent p-3 shadow-none sm:p-4 md:p-5"
                components={calendarComponents}
              />
            </div>
          ) : viewMode === "week" ? (
            <div className="space-y-5 md:space-y-6">
              <div className="flex flex-wrap items-center justify-center gap-3 px-1 py-1 sm:justify-between sm:gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setWeekAnchor((w) => subWeeks(w, 1))}
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">Poprzedni tydzień</span>
                  <span className="sm:hidden">Wstecz</span>
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={goToday}>
                  Bieżący tydzień
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
                >
                  <span className="hidden sm:inline">Następny tydzień</span>
                  <span className="sm:hidden">Dalej</span>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 xl:grid-cols-7 xl:gap-4">
                {weekDays.map((d) => {
                  const key = dayKey(d);
                  const list = invoicesByDay.get(key) ?? [];
                  const isDayToday =
                    d.getFullYear() === today.getFullYear() &&
                    d.getMonth() === today.getMonth() &&
                    d.getDate() === today.getDate();
                  return (
                    <Card
                      key={key}
                      className={cn(
                        "border-border/70 flex flex-col gap-0 overflow-hidden py-0 shadow-sm transition-shadow duration-150 hover:shadow-md",
                        isDayToday && "ring-primary/40 ring-2",
                      )}
                    >
                      <CardHeader className="bg-muted/30 space-y-1.5 px-5 pb-4 pt-4">
                        <CardTitle className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                          {format(d, "EEE", { locale: pl })}
                        </CardTitle>
                        <p className="text-xl font-semibold tabular-nums tracking-tight">
                          {format(d, "d", { locale: pl })}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {list.length}{" "}
                          {list.length === 1 ? "faktura" : list.length < 5 ? "faktury" : "faktur"}
                        </p>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-3 px-5 pb-4 pt-2">
                        {list.length === 0 ? (
                          <p className="text-muted-foreground py-6 text-center text-xs">Brak pozycji</p>
                        ) : (
                          list.map((inv) => (
                            <button
                              key={inv.id}
                              type="button"
                              className="hover:border-border hover:bg-muted/65 dark:hover:bg-muted/40 rounded-lg border border-border/80 p-3 text-left text-xs transition-colors duration-150"
                              onClick={() => onDayOpen(d)}
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn("size-1.5 shrink-0 rounded-full", statusDotClass(inv.status))}
                                />
                                <span className="truncate font-medium">{inv.invoiceNumber ?? "—"}</span>
                              </div>
                              <p className="text-muted-foreground mt-1.5 truncate">{inv.contractorName}</p>
                              <p className="text-foreground mt-2 tabular-nums text-[11px] font-medium">
                                {inv.amountGross != null ? formatMoneyPl(Number(inv.amountGross)) : "—"}
                              </p>
                              <Badge variant="secondary" className="mt-2 h-5 px-1.5 text-[10px] font-normal">
                                {documentStatusPl(inv.status)}
                              </Badge>
                              {isOverdue(inv) && (
                                <p className="text-destructive mt-1 text-[10px] font-medium">Po terminie</p>
                              )}
                            </button>
                          ))
                        )}
                        {list.length > 0 && (
                          <Button variant="ghost" size="sm" className="mt-auto h-9 text-xs" type="button" asChild>
                            <Link href={`/documents?from=${key}&to=${key}`}>Lista dnia</Link>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-5 md:space-y-6">
              <Card
                className={cn(
                  "border-border/70 gap-0 overflow-hidden py-0 shadow-sm",
                  dayAnchor.getFullYear() === today.getFullYear() &&
                    dayAnchor.getMonth() === today.getMonth() &&
                    dayAnchor.getDate() === today.getDate() &&
                    "ring-primary/35 ring-2",
                )}
              >
                <CardHeader className="bg-muted/30 space-y-2 px-5 pb-5 pt-5">
                  <CardTitle className="text-base font-semibold capitalize">{dayLabel}</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    {dayList.length}{" "}
                    {dayList.length === 1 ? "faktura" : dayList.length < 5 ? "faktury" : "faktur"}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 px-5 pb-6 pt-3">
                  {dayList.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center text-sm">Brak faktur w tym dniu.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {dayList.map((inv) => (
                        <button
                          key={inv.id}
                          type="button"
                          className="hover:border-border hover:bg-muted/65 dark:hover:bg-muted/40 rounded-xl border border-border/80 p-5 text-left text-sm transition-colors duration-150"
                          onClick={() => onDayOpen(dayAnchor)}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={cn("size-2 shrink-0 rounded-full", statusDotClass(inv.status))} />
                            <span className="font-semibold">{inv.invoiceNumber ?? "—"}</span>
                          </div>
                          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{inv.contractorName}</p>
                          <p className="mt-3 text-lg font-semibold tabular-nums">
                            {inv.amountGross != null ? formatMoneyPl(Number(inv.amountGross)) : "—"}
                          </p>
                          <Badge variant="secondary" className="mt-3">
                            {documentStatusPl(inv.status)}
                          </Badge>
                          {isOverdue(inv) && (
                            <p className="text-destructive mt-3 text-xs font-medium">Po terminie płatności</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {dayList.length > 0 ? (
                    <Button variant="outline" size="sm" className="mt-1 w-full sm:w-auto" type="button" asChild>
                      <Link href={`/documents?from=${dayKey(dayAnchor)}&to=${dayKey(dayAnchor)}`}>
                        Pełna lista dnia
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <InvoiceDayDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          date={dialogDate}
          invoices={dialogInvoices}
          onRefresh={() => setReloadToken((x) => x + 1)}
        />
      </InvoiceCalendarContext.Provider>
    </TooltipProvider>
  );
}
