"use client";

import * as React from "react";

import type { CalendarInvoice } from "@/components/calendar/calendar-utils";

export type InvoiceCalendarContextValue = {
  invoicesByDay: Map<string, CalendarInvoice[]>;
  onDayOpen: (date: Date) => void;
  today: Date;
};

export const InvoiceCalendarContext = React.createContext<InvoiceCalendarContextValue | null>(
  null,
);

export function useInvoiceCalendar() {
  const v = React.useContext(InvoiceCalendarContext);
  if (!v) throw new Error("useInvoiceCalendar must be used within InvoiceCalendarContext.Provider");
  return v;
}
