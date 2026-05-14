"use client";

import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { DayButton, type DayButtonProps } from "react-day-picker";

import { useInvoiceCalendar } from "@/components/calendar/calendar-context";
import {
  dayKey,
  isOverdue,
  ocrStatusLabel,
  statusDotClass,
} from "@/components/calendar/calendar-utils";
import { documentStatusPl } from "@/lib/ui-i18n";
import { formatMoneyPl } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MAX_VISIBLE = 3;

export function InvoiceDayButton(props: DayButtonProps) {
  const { day, modifiers, className, onClick, ...rest } = props;
  const { invoicesByDay, onDayOpen, today } = useInvoiceCalendar();
  const key = dayKey(day.date);
  const list = invoicesByDay.get(key) ?? [];
  const count = list.length;
  const hasOverdue = list.some(isOverdue);
  const hasReview = list.some((i) => i.status === "review");

  const isToday =
    day.date.getFullYear() === today.getFullYear() &&
    day.date.getMonth() === today.getMonth() &&
    day.date.getDate() === today.getDate();

  const tooltipBody =
    count === 0 ? (
      <p>Brak faktur w tym dniu.</p>
    ) : (
      <ul className="max-w-xs space-y-2">
        {list.map((inv) => (
          <li key={inv.id} className="border-border/60 border-b pb-2 last:border-0 last:pb-0">
            <p className="font-medium">{inv.invoiceNumber ?? "—"}</p>
            <p className="text-muted-foreground">{inv.contractorName}</p>
            <p>
              {inv.amountGross != null && inv.amountGross !== ""
                ? formatMoneyPl(Number(inv.amountGross))
                : "—"}
            </p>
            <p className="text-muted-foreground">{ocrStatusLabel(inv.hasOcr)}</p>
            <p>{documentStatusPl(inv.status)}</p>
            {isOverdue(inv) && <p className="text-destructive font-medium">Po terminie płatności</p>}
          </li>
        ))}
      </ul>
    );

  const visible = list.slice(0, MAX_VISIBLE);
  const moreCount = count > MAX_VISIBLE ? count - MAX_VISIBLE : 0;

  return (
    <Tooltip delayDuration={280}>
      <TooltipTrigger asChild>
        <DayButton
          day={day}
          modifiers={modifiers}
          className={cn(
            "group/daybtn flex h-full min-h-[7rem] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg px-2 py-2.5 text-center font-normal transition-colors duration-150",
            isToday && !modifiers.selected && "bg-primary/8 ring-primary/45 ring-2 ring-inset",
            modifiers.selected &&
              "ring-primary bg-accent/25 z-[1] ring-2 shadow-sm ring-inset ring-offset-0 ring-offset-background",
            hasOverdue && "border-destructive/50 border-l-[3px]",
            hasReview && !hasOverdue && "border-amber-400/50 border-l-[3px]",
            count > 0 && "hover:bg-muted/40 hover:ring-1 hover:ring-border/35 hover:ring-inset",
            className,
          )}
          onClick={(e) => {
            onClick?.(e as React.MouseEvent<HTMLButtonElement>);
            onDayOpen(day.date);
          }}
          {...rest}
        >
          <span className="sr-only">{format(day.date, "PPP", { locale: pl })}</span>
          <span className="text-foreground shrink-0 text-[11px] font-semibold tabular-nums leading-none">
            {format(day.date, "d", { locale: pl })}
          </span>
          {count === 0 ? (
            <span className="text-muted-foreground mt-0.5 text-[10px] leading-none">—</span>
          ) : (
            <div className="mt-1 flex w-full min-w-0 flex-col items-center justify-center gap-1">
              {visible.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-muted/50 border-border/40 flex w-full max-w-[min(100%,7.25rem)] min-w-0 items-center gap-1 rounded border px-1.5 py-1 text-left text-[9px] leading-snug shadow-sm"
                >
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", statusDotClass(inv.status))}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate pl-0.5 text-left font-medium">
                    {inv.invoiceNumber ?? "—"}
                  </span>
                  <span className="text-muted-foreground shrink-0 tabular-nums font-medium">
                    {inv.amountGross != null && inv.amountGross !== ""
                      ? formatMoneyPl(Number(inv.amountGross))
                      : "—"}
                  </span>
                </div>
              ))}
              {moreCount > 0 ? (
                <span className="text-muted-foreground text-[9px] font-semibold leading-tight">
                  +{moreCount} więcej
                </span>
              ) : null}
            </div>
          )}
        </DayButton>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="center"
        sideOffset={6}
        className="max-w-[min(18rem,calc(100vw-1.5rem))] border-border/60 px-2.5 py-2 text-xs shadow-md"
      >
        <p className="mb-1 text-center text-[11px] font-semibold">
          {format(day.date, "EEEE, d MMMM yyyy", { locale: pl })}
        </p>
        {tooltipBody}
      </TooltipContent>
    </Tooltip>
  );
}
