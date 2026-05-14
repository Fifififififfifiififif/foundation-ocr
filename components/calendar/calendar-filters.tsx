"use client";

import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export type CalendarFilterState = {
  contractorId: string;
  projectId: string;
  noContractor: boolean;
  noProject: boolean;
  status: string;
  ocr: string;
  issueFrom: string;
  issueTo: string;
  minGross: string;
  maxGross: string;
  overdueOnly: boolean;
};

type Opt = { id: string; name: string };

type Props = {
  projects: Opt[];
  contractors: Opt[];
  value: CalendarFilterState;
  onChange: (next: CalendarFilterState) => void;
  /** "sheet" = zawartość pod nagłówkiem panelu bocznego (bez karty). */
  variant?: "card" | "sheet";
};

/** Pola w karcie (szeroki layout) — czytelna ramka. */
const filterControlCard =
  "h-auto min-h-10 border-border bg-card px-3 py-2.5 text-sm ring-offset-2 ring-offset-background dark:border-white/35 sm:min-h-11";

/** Pola w wąskim sheet — grubsza ramka, pełna szerokość, bez obcinania etykiet selecta. */
const filterControlSheet = cn(
  "h-auto min-h-12 w-full min-w-0 rounded-lg border-2 border-border bg-card px-3.5 py-3 text-sm",
  "shadow-sm ring-offset-2 ring-offset-background dark:border-white/50 dark:bg-zinc-950/90",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
  "[&>span]:line-clamp-none [&>span]:text-left",
);

export function CalendarFilters({ projects, contractors, value, onChange, variant = "card" }: Props) {
  const isSheet = variant === "sheet";
  const patch = (p: Partial<CalendarFilterState>) => onChange({ ...value, ...p });

  const fromDate = value.issueFrom ? new Date(value.issueFrom) : undefined;
  const toDate = value.issueTo ? new Date(value.issueTo) : undefined;

  const hasActive =
    Boolean(
      value.contractorId ||
        value.projectId ||
        value.noContractor ||
        value.noProject ||
        value.status ||
        value.ocr ||
        value.issueFrom ||
        value.issueTo ||
        value.minGross ||
        value.maxGross ||
        value.overdueOnly,
    );

  const clearFilters = () =>
    onChange({
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
    });

  const labelClass = cn(
    "block font-medium leading-snug",
    isSheet ? "text-foreground pb-1 text-sm" : "text-xs",
  );

  const fieldStack = cn("flex flex-col", isSheet ? "gap-4" : "gap-3.5");

  const sheetSection = cn(
    "rounded-xl border-2 border-border bg-card/90 p-5 sm:p-6",
    "dark:border-white/45 dark:bg-zinc-950/70",
  );

  const gridTop = isSheet ? "grid grid-cols-1 gap-5" : "grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4";
  const gridBottom = isSheet ? "grid grid-cols-1 gap-5 sm:grid-cols-2" : "grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4";
  const selectClass = isSheet ? filterControlSheet : filterControlCard;
  const inputClass = isSheet ? filterControlSheet : filterControlCard;
  const dateBtnClass = isSheet ? cn(filterControlSheet, "justify-start font-normal") : cn(filterControlCard, "w-full justify-start font-normal");

  const body = (
    <div className={cn(isSheet ? "flex flex-col gap-6" : "space-y-8")}>
      <div className={cn(isSheet && sheetSection)}>
        <p
          className={cn(
            "text-muted-foreground font-semibold tracking-wide uppercase",
            isSheet ? "mb-5 text-xs" : "mb-4 text-[11px]",
          )}
        >
          Kontrahent i projekt
        </p>
        <div className={gridTop}>
          <div className={fieldStack}>
            <Label className={labelClass}>Kontrahent</Label>
            <Select
              value={value.contractorId || "all"}
              onValueChange={(v) => patch({ contractorId: v === "all" ? "" : v, noContractor: false })}
            >
              <SelectTrigger className={selectClass}>
                <SelectValue placeholder="Wszyscy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy</SelectItem>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={fieldStack}>
            <Label className={labelClass}>Projekt</Label>
            <Select
              value={value.projectId || "all"}
              onValueChange={(v) => patch({ projectId: v === "all" ? "" : v, noProject: false })}
            >
              <SelectTrigger className={selectClass}>
                <SelectValue placeholder="Wszystkie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={fieldStack}>
            <Label className={labelClass}>Status faktury</Label>
            <Select value={value.status || "all"} onValueChange={(v) => patch({ status: v === "all" ? "" : v })}>
              <SelectTrigger className={selectClass}>
                <SelectValue placeholder="Wszystkie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="draft">Szkic</SelectItem>
                <SelectItem value="review">Do weryfikacji</SelectItem>
                <SelectItem value="approved">Zatwierdzona</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={fieldStack}>
            <Label className={labelClass}>OCR</Label>
            <Select value={value.ocr || "all"} onValueChange={(v) => patch({ ocr: v === "all" ? "" : v })}>
              <SelectTrigger className={selectClass}>
                <SelectValue placeholder="Wszystkie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="yes">Przetworzono OCR</SelectItem>
                <SelectItem value="no">Bez OCR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center gap-x-8 gap-y-3",
            isSheet ? "pt-2" : "pt-1",
          )}
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id="cal-no-project"
              checked={value.noProject}
              onCheckedChange={(c) =>
                patch({
                  noProject: c === true,
                  projectId: c === true ? "" : value.projectId,
                })
              }
              className={cn(isSheet && "size-4")}
            />
            <Label
              htmlFor="cal-no-project"
              className={cn(
                "cursor-pointer font-normal",
                isSheet ? "text-foreground text-sm" : "text-xs",
              )}
            >
              Tylko bez projektu
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="cal-no-contractor"
              checked={value.noContractor}
              onCheckedChange={(c) =>
                patch({
                  noContractor: c === true,
                  contractorId: c === true ? "" : value.contractorId,
                })
              }
              className={cn(isSheet && "size-4")}
            />
            <Label
              htmlFor="cal-no-contractor"
              className={cn(
                "cursor-pointer font-normal",
                isSheet ? "text-foreground text-sm" : "text-xs",
              )}
            >
              Tylko bez kontrahenta
            </Label>
          </div>
        </div>
      </div>

      {isSheet ? <div className="h-px shrink-0 bg-border dark:bg-white/15" /> : <Separator className="my-1 bg-border dark:bg-white/12" />}

      <div className={cn(isSheet && sheetSection)}>
        <p
          className={cn(
            "text-muted-foreground font-semibold tracking-wide uppercase",
            isSheet ? "mb-5 text-xs" : "mb-4 text-[11px]",
          )}
        >
          Stan płatności
        </p>
        <div
          className={cn(
            "flex items-start",
            isSheet
              ? "gap-4 pt-1"
              : "gap-3.5 rounded-lg border border-border bg-muted/25 px-4 py-4 dark:border-white/30 dark:bg-muted/10",
          )}
        >
          <Checkbox
            id="cal-overdue"
            checked={value.overdueOnly}
            onCheckedChange={(c) => patch({ overdueOnly: c === true })}
            className={cn("mt-0.5", isSheet && "mt-1 size-4")}
          />
          <Label
            htmlFor="cal-overdue"
            className={cn(
              "cursor-pointer font-normal leading-relaxed",
              isSheet ? "text-foreground text-sm" : "text-xs",
            )}
          >
            Tylko faktury <span className="font-semibold">po terminie płatności</span> (termin minął, status inny niż
            zatwierdzony). Nadal obowiązuje zakres dat wystawienia z kalendarza lub poniższy filtr dat.
          </Label>
        </div>
      </div>

      {isSheet ? <div className="h-px shrink-0 bg-border dark:bg-white/15" /> : <Separator className="my-1 bg-border dark:bg-white/12" />}

      <div className={cn(isSheet && sheetSection)}>
        <p
          className={cn(
            "text-muted-foreground font-semibold tracking-wide uppercase",
            isSheet ? "mb-5 text-xs" : "mb-4 text-[11px]",
          )}
        >
          Zakres dat wystawienia i kwoty
        </p>
        <div className={gridBottom}>
          <div className={fieldStack}>
            <Label className={labelClass}>Data wystawienia od</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn(dateBtnClass, !isSheet && "w-full")}>
                  {fromDate ? format(fromDate, "dd.MM.yyyy", { locale: pl }) : "Wybierz datę"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(d) => patch({ issueFrom: d ? format(d, "yyyy-MM-dd") : "" })}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className={fieldStack}>
            <Label className={labelClass}>Data wystawienia do</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn(dateBtnClass, !isSheet && "w-full")}>
                  {toDate ? format(toDate, "dd.MM.yyyy", { locale: pl }) : "Wybierz datę"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(d) => patch({ issueTo: d ? format(d, "yyyy-MM-dd") : "" })}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className={fieldStack}>
            <Label htmlFor="cal-min-gross" className={labelClass}>
              Kwota brutto od
            </Label>
            <Input
              id="cal-min-gross"
              className={inputClass}
              value={value.minGross}
              onChange={(e) => patch({ minGross: e.target.value })}
              inputMode="decimal"
              placeholder={"np. 100\u00a0zł"}
            />
          </div>

          <div className={fieldStack}>
            <Label htmlFor="cal-max-gross" className={labelClass}>
              Kwota brutto do
            </Label>
            <Input
              id="cal-max-gross"
              className={inputClass}
              value={value.maxGross}
              onChange={(e) => patch({ maxGross: e.target.value })}
              inputMode="decimal"
              placeholder={"np. 10\u00a0000\u00a0zł"}
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (variant === "sheet") {
    return (
      <div className="space-y-6 pb-4">
        {hasActive ? (
          <div className="flex justify-end border-b border-border pb-4 dark:border-white/15">
            <Button type="button" variant="outline" size="sm" className="h-10 border-border px-4 dark:border-white/40" onClick={clearFilters}>
              Wyczyść filtry
            </Button>
          </div>
        ) : null}
        {body}
      </div>
    );
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-4 sm:pb-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
              <Filter className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base">Filtry</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Zawęż widok kalendarza — zmiana odświeża dane automatycznie.
              </CardDescription>
            </div>
          </div>
          {hasActive && (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground h-8 shrink-0" onClick={clearFilters}>
              Wyczyść
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-6 pt-0 sm:px-6">{body}</CardContent>
    </Card>
  );
}
