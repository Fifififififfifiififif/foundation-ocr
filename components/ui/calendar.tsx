"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { pl } from "date-fns/locale";

import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={pl}
      className={cn(
        "rdp-root rounded-xl border border-border/80 bg-card p-4 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Calendar };
