"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Wallet } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoneyPl } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import type { FinancialOverview } from "@/src/modules/finance/types";

type Props = {
  overview: FinancialOverview;
};

function AnimatedAmount({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let frame: number;

    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className="tabular-nums">{formatMoneyPl(display)}</span>;
}

const toneStyles = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-rose-600 dark:text-rose-400",
  neutral: "text-sky-600 dark:text-sky-400",
  default: "text-muted-foreground",
} as const;

export function FinancialOverviewCards({ overview }: Props) {
  const cards = [
    {
      key: "income",
      label: "Przychód",
      value: overview.income,
      hint: "Suma faktur przychodowych",
      tone: "positive" as const,
      icon: ArrowUpRight,
    },
    {
      key: "expenses",
      label: "Wydatki",
      value: overview.expenses,
      hint: "Suma faktur kosztowych",
      tone: "negative" as const,
      icon: ArrowDownRight,
    },
    {
      key: "profit",
      label: "Dochód",
      value: overview.profit,
      hint: "Przychód minus wydatki",
      tone: (overview.profit >= 0 ? "positive" : "negative") as "positive" | "negative",
      icon: overview.profit >= 0 ? ArrowUpRight : ArrowDownRight,
    },
    {
      key: "balance",
      label: "Stan konta",
      value: overview.accountBalance,
      hint: "Suma sald rachunków bankowych",
      tone: "neutral" as const,
      icon: Wallet,
    },
    {
      key: "commitments",
      label: "Zobowiązania",
      value: overview.commitments,
      hint: "Rezerwy i przyszłe zobowiązania",
      tone: "default" as const,
      icon: Minus,
    },
    {
      key: "available",
      label: "Środki dostępne",
      value: overview.availableFunds,
      hint: "Stan konta minus zobowiązania",
      tone: (overview.availableFunds >= 0 ? "positive" : "negative") as "positive" | "negative",
      icon: Wallet,
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Przegląd finansowy</h2>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Przychody, wydatki, saldo kont i dostępne środki — na podstawie sklasyfikowanych faktur i ręcznie
            skonfigurowanych rachunków.
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          Przeliczone: {overview.computedAt.toLocaleString("pl-PL")}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.key}
              className="border-border/80 overflow-hidden shadow-sm transition-all duration-300 hover:border-border hover:shadow-md"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {card.label}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">{card.hint}</CardDescription>
                </div>
                <div className={cn("rounded-lg bg-muted/60 p-2", toneStyles[card.tone])}>
                  <Icon className="size-4" aria-hidden />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  <AnimatedAmount value={card.value} />
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
