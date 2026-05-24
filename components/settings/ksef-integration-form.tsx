"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  connectKsefAction,
  getKsefIntegrationAction,
  importKsefInvoicesAction,
  testKsefConnectionAction,
  type KsefIntegrationView,
} from "@/app/actions/ksef";
import { rethrowNextNavigation } from "@/lib/rethrow-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  initial: KsefIntegrationView | null;
  organizationNip: string | null;
};

export function KsefIntegrationForm({ initial, organizationNip }: Props) {
  const [pending, start] = useTransition();
  const [environment, setEnvironment] = useState<"test" | "prod">(initial?.environment ?? "test");
  const [nip, setNip] = useState(initial?.nip ?? organizationNip ?? "");
  const [token, setToken] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ksefReference, setKsefReference] = useState("");
  const [status, setStatus] = useState(initial);

  function connect() {
    start(async () => {
      try {
        const r = await connectKsefAction({ environment, nip, token });
        if (r.ok) {
          toast.success(r.message);
          setToken("");
          const view = await getKsefIntegrationAction();
          setStatus(view);
        } else toast.error(r.error);
      } catch (e) {
        rethrowNextNavigation(e);
        toast.error(e instanceof Error ? e.message : "Błąd połączenia KSeF.");
      }
    });
  }

  function testConnection() {
    start(async () => {
      try {
        const r = await testKsefConnectionAction();
        if (r.ok) toast.success(r.message);
        else toast.error(r.error);
      } catch (e) {
        rethrowNextNavigation(e);
        toast.error(e instanceof Error ? e.message : "Test połączenia nie powiódł się.");
      }
    });
  }

  function importInvoices(direction: "received" | "issued") {
    start(async () => {
      try {
        const r = await importKsefInvoicesAction({
          direction,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          ksefReference: ksefReference || undefined,
        });
        if (r.ok) toast.success(r.message);
        else toast.error(r.error);
      } catch (e) {
        rethrowNextNavigation(e);
        toast.error(e instanceof Error ? e.message : "Import KSeF nie powiódł się.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">KSeF Integracja</h3>
        {status ? (
          <Badge variant={status.status === "connected" ? "default" : "secondary"}>{status.status}</Badge>
        ) : (
          <Badge variant="secondary">niepołączono</Badge>
        )}
      </div>

      {status?.lastSyncMessage ? (
        <p className="text-muted-foreground text-sm">{status.lastSyncMessage}</p>
      ) : null}
      {status?.lastError ? <p className="text-destructive text-sm">{status.lastError}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Środowisko KSeF</Label>
          <Select value={environment} onValueChange={(v) => setEnvironment(v as "test" | "prod")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="test">Test</SelectItem>
              <SelectItem value="prod">Produkcja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ksefNip">NIP</Label>
          <Input id="ksefNip" value={nip} onChange={(e) => setNip(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ksefToken">Token KSeF</Label>
          <Input id="ksefToken" type="password" value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={connect}>
          Połącz KSeF
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={testConnection}>
          Test połączenia
        </Button>
      </div>

      <section className="space-y-4 border-t pt-6">
        <h4 className="font-medium">Import faktur</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dateFrom">Data od</Label>
            <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateTo">Data do</Label>
            <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ksefRef">Numer KSeF</Label>
            <Input id="ksefRef" value={ksefReference} onChange={(e) => setKsefReference(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => importInvoices("received")}>
            Import otrzymanych
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => importInvoices("issued")}>
            Import wystawionych
          </Button>
        </div>
      </section>
    </div>
  );
}
