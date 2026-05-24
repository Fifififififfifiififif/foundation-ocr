"use client";

import * as React from "react";
import { Building2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrganizationRegistryProfile } from "@/src/modules/krs/types";
import { cn } from "@/lib/utils";

export type RegistryFormValues = {
  organizationName: string;
  legalForm: string;
  address: string;
  nip: string;
  regon: string;
  krs: string;
  registryStatus: string;
};

type Props = {
  values: RegistryFormValues;
  onChange: (patch: Partial<RegistryFormValues>) => void;
  onVerifiedChange?: (verified: boolean) => void;
  /** Po udanym lookup wywołaj zapis po stronie serwera (ustawienia organizacji). */
  persistOnLookup?: (
    ids: { krs?: string; nip?: string; regon?: string },
  ) => Promise<{
    ok: boolean;
    error?: string;
    message?: string;
    profile?: OrganizationRegistryProfile;
  }>;
  disabled?: boolean;
  className?: string;
  /** Pola nazwy organizacji (rejestracja) — domyślnie organizationName */
  nameField?: keyof RegistryFormValues;
};

type LookupResponse =
  | {
      ok: true;
      profile: OrganizationRegistryProfile;
      hasOfficialKrsData: boolean;
    }
  | { ok: false; error?: string };

export function KrsRegistryLookup({
  values,
  onChange,
  onVerifiedChange,
  persistOnLookup,
  disabled,
  className,
  nameField = "organizationName",
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [lastSource, setLastSource] = React.useState<string | null>(null);
  const [krsVerified, setKrsVerified] = React.useState<boolean | null>(null);

  async function handleLookup() {
    const krs = values.krs.trim();
    const nip = values.nip.trim();
    const regon = values.regon.trim();
    if (!krs && !nip && !regon) {
      toast.error("Wpisz numer KRS, NIP lub REGON.");
      return;
    }

    setLoading(true);
    try {
      const ids = {
        ...(krs ? { krs } : {}),
        ...(nip ? { nip } : {}),
        ...(regon ? { regon } : {}),
      };

      if (persistOnLookup) {
        const saved = await persistOnLookup(ids);
        if (!saved.ok) {
          toast.error(saved.error ?? "Nie udało się pobrać danych rejestrowych.");
          onVerifiedChange?.(false);
          setKrsVerified(false);
          return;
        }
        const p = saved.profile;
        if (p) {
          onChange({
            [nameField]: p.organizationName,
            legalForm: p.legalForm ?? "",
            address: p.address ?? "",
            nip: p.nip ?? "",
            regon: p.regon ?? "",
            krs: p.krs ?? "",
            registryStatus: p.registryStatus ?? "",
          });
          setLastSource(p.source);
          setKrsVerified(p.verifiedFromKrs);
          onVerifiedChange?.(p.verifiedFromKrs);
        }
        toast.success(saved.message ?? "Dane rejestrowe zapisane.");
        return;
      }

      const res = await fetch("/api/krs/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids),
      });
      const data = (await res.json()) as LookupResponse;
      if (!data.ok) {
        toast.error(data.error ?? "Nie udało się pobrać danych.");
        onVerifiedChange?.(false);
        setKrsVerified(false);
        return;
      }

      const p = data.profile;
      onChange({
        [nameField]: p.organizationName,
        legalForm: p.legalForm ?? "",
        address: p.address ?? "",
        nip: p.nip ?? "",
        regon: p.regon ?? "",
        krs: p.krs ?? "",
        registryStatus: p.registryStatus ?? "",
      });
      setLastSource(p.source);
      setKrsVerified(data.hasOfficialKrsData);
      onVerifiedChange?.(data.hasOfficialKrsData);

      toast.success(
        data.hasOfficialKrsData
          ? "Dane pobrane z oficjalnego KRS."
          : "Dane pobrane z rejestru podatkowego (bez pełnego odpisu KRS).",
      );
    } catch {
      toast.error("Błąd połączenia z usługą weryfikacji.");
      onVerifiedChange?.(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("space-y-4 rounded-lg border border-dashed p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Building2 className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Weryfikacja w rejestrze</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Podaj KRS, NIP lub REGON i pobierz dane z oficjalnego rejestru (KRS MS + rejestr podatkowy).
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="registry-krs">KRS</Label>
          <Input
            id="registry-krs"
            name="krs"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0000123456"
            value={values.krs}
            disabled={disabled || loading}
            onChange={(e) => onChange({ krs: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registry-nip">NIP</Label>
          <Input
            id="registry-nip"
            name="nip"
            inputMode="numeric"
            autoComplete="off"
            placeholder="5250000000"
            value={values.nip}
            disabled={disabled || loading}
            onChange={(e) => onChange({ nip: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registry-regon">REGON</Label>
          <Input
            id="registry-regon"
            name="regon"
            inputMode="numeric"
            autoComplete="off"
            placeholder="123456789"
            value={values.regon}
            disabled={disabled || loading}
            onChange={(e) => onChange({ regon: e.target.value })}
          />
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full sm:w-auto"
        disabled={disabled || loading}
        onClick={() => void handleLookup()}
      >
        {loading ? (
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
        ) : (
          <Search className="mr-2 size-4" aria-hidden />
        )}
        Pobierz dane organizacji
      </Button>

      {krsVerified === true ? (
        <p
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300"
          role="status"
        >
          Zweryfikowano w oficjalnym KRS (odpis aktualny). Data zapisana w organizacji.
        </p>
      ) : krsVerified === false && values.registryStatus ? (
        <p
          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
          role="status"
        >
          Dane z rejestru podatkowego lub bez pełnego odpisu KRS — organizacja nie ma flagi pełnej
          weryfikacji. Podaj numer KRS i pobierz ponownie.
        </p>
      ) : null}

      {values.registryStatus ? (
        <p className="text-muted-foreground text-xs" role="status">
          Status rejestru: {values.registryStatus}
          {lastSource ? ` · źródło: ${lastSource.toUpperCase()}` : null}
        </p>
      ) : null}

      {values.legalForm ? (
        <p className="text-muted-foreground text-xs">Forma prawna: {values.legalForm}</p>
      ) : null}
    </div>
  );
}
