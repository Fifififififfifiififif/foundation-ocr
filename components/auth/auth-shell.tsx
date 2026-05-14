import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AuthShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="from-muted/40 via-background to-background flex min-h-full flex-col justify-center bg-gradient-to-b px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p> : null}
        </div>
        <div className={cn("bg-card text-card-foreground rounded-xl border p-6 shadow-sm")}>{children}</div>
      </div>
    </div>
  );
}
