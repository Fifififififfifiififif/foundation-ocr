"use client";

import * as React from "react";
import Link from "next/link";

import { signUpWithPassword } from "@/app/actions/auth";
import {
  KrsRegistryLookup,
  type RegistryFormValues,
} from "@/components/organization/krs-registry-lookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  supabaseReady: boolean;
  error?: string;
};

export function RegisterOrganizationForm({ supabaseReady, error }: Props) {
  const [registryVerified, setRegistryVerified] = React.useState(false);
  const [registry, setRegistry] = React.useState<RegistryFormValues>({
    organizationName: "",
    legalForm: "",
    address: "",
    nip: "",
    regon: "",
    krs: "",
    registryStatus: "",
  });

  function patchRegistry(patch: Partial<RegistryFormValues>) {
    setRegistry((prev) => ({ ...prev, ...patch }));
  }

  return (
    <form action={signUpWithPassword} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Imię i nazwisko</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>

      <KrsRegistryLookup
        values={registry}
        onChange={patchRegistry}
        onVerifiedChange={setRegistryVerified}
        disabled={!supabaseReady}
      />

      <div className="space-y-2">
        <Label htmlFor="organizationName">Nazwa organizacji</Label>
        <Input
          id="organizationName"
          name="organizationName"
          required
          value={registry.organizationName}
          onChange={(e) => patchRegistry({ organizationName: e.target.value })}
        />
      </div>

      <input type="hidden" name="organizationLegalForm" value={registry.legalForm} />
      <input type="hidden" name="organizationAddress" value={registry.address} />
      <input type="hidden" name="organizationNip" value={registry.nip} />
      <input type="hidden" name="organizationRegon" value={registry.regon} />
      <input type="hidden" name="organizationKrs" value={registry.krs} />
      <input type="hidden" name="organizationRegistryStatus" value={registry.registryStatus} />
      <input type="hidden" name="organizationRegistryVerified" value={registryVerified ? "1" : "0"} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Hasło (min. 8 znaków)</Label>
        <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={!supabaseReady}>
        Zarejestruj
      </Button>

      <p className="text-muted-foreground text-sm">
        Masz konto?{" "}
        <Link href="/logowanie" className="hover:text-foreground font-medium">
          Zaloguj się
        </Link>
      </p>
    </form>
  );
}
