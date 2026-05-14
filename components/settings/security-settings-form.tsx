"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateSecuritySettings } from "@/app/actions/foundation-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Initial = {
  sessionTimeoutMinutes: number;
};

export function SecuritySettingsForm({ initial }: { initial: Initial }) {
  const [pending, start] = useTransition();
  const [minutes, setMinutes] = useState(String(initial.sessionTimeoutMinutes));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const m = Number(minutes);
    start(async () => {
      const r = await updateSecuritySettings({
        sessionTimeoutMinutes: m,
      });
      if (r.ok) toast.success(r.message ?? "Zapisano.");
      else toast.error(r.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="flex flex-col gap-4">
        <Label htmlFor="session" className="shrink-0">
          Limit bezczynności (minuty)
        </Label>
        <Input
          id="session"
          type="number"
          min={15}
          max={10080}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="max-w-xs"
        />
        <p className="text-muted-foreground text-sm">
          Po tym czasie bez żadnego żądania do serwera (nawigacja, zapis, API) sesja zostanie zakończona i użytkownik
          trafi na stronę logowania.
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Zapisywanie…" : "Zapisz ustawienia bezpieczeństwa"}
      </Button>
    </form>
  );
}
