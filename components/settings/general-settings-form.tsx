"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateGeneralSettings } from "@/app/actions/foundation-settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Initial = {
  timezone: string;
  currency: string;
};

export function GeneralSettingsForm({ initial }: { initial: Initial }) {
  const [pending, start] = useTransition();
  const [timezone, setTimezone] = useState(initial.timezone);
  const [currency, setCurrency] = useState(initial.currency);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await updateGeneralSettings({
        appLanguage: "pl",
        timezone,
        dateFormat: "dd.MM.yyyy",
        currency,
      });
      if (r.ok) toast.success(r.message ?? "Zapisano.");
      else toast.error(r.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Label className="shrink-0">Strefa czasowa</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Europe/Warsaw">Europe/Warsaw</SelectItem>
              <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-4">
          <Label className="shrink-0">Waluta raportów</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PLN">PLN</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Zapisywanie…" : "Zapisz zmiany"}
      </Button>
    </form>
  );
}
