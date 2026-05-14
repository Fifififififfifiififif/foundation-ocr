"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateNotificationSettings } from "@/app/actions/foundation-settings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Initial = {
  emailAlertsGeneral: boolean;
  emailAlertsOcr: boolean;
  emailAlertsExport: boolean;
};

export function NotificationSettingsForm({ initial }: { initial: Initial }) {
  const [pending, start] = useTransition();
  const [general, setGeneral] = useState(initial.emailAlertsGeneral);
  const [ocr, setOcr] = useState(initial.emailAlertsOcr);
  const [exp, setExp] = useState(initial.emailAlertsExport);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await updateNotificationSettings({
        emailAlertsGeneral: general,
        emailAlertsOcr: ocr,
        emailAlertsExport: exp,
      });
      if (r.ok) toast.success(r.message ?? "Zapisano.");
      else toast.error(r.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Checkbox id="g" checked={general} onCheckedChange={(v) => setGeneral(v === true)} />
          <div className="grid gap-1">
            <Label htmlFor="g" className="cursor-pointer font-medium">
              Ogólne alerty e-mail
            </Label>
            <p className="text-muted-foreground text-sm">
              Powiadomienia o ważnych zdarzeniach w systemie (wymaga skonfigurowanej poczty w przyszłych wersjach).
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Checkbox id="o" checked={ocr} onCheckedChange={(v) => setOcr(v === true)} />
          <div className="grid gap-1">
            <Label htmlFor="o" className="cursor-pointer font-medium">
              Zakończenie OCR
            </Label>
            <p className="text-muted-foreground text-sm">Powiadomienie po poprawnym odczycie dokumentu.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Checkbox id="e" checked={exp} onCheckedChange={(v) => setExp(v === true)} />
          <div className="grid gap-1">
            <Label htmlFor="e" className="cursor-pointer font-medium">
              Zakończenie eksportu
            </Label>
            <p className="text-muted-foreground text-sm">Paczki ZIP i eksporty dla księgowości.</p>
          </div>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Zapisywanie…" : "Zapisz preferencje"}
      </Button>
    </form>
  );
}
