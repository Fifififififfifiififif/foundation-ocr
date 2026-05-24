"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

import {
  applyOrganizationRegistryLookupAction,
  reverifyOrganizationKrsAction,
} from "@/app/actions/krs-registry";
import {
  removeOrganizationLogo,
  updateOrganizationProfile,
  uploadOrganizationLogo,
} from "@/app/actions/foundation-settings";
import {
  KrsRegistryLookup,
  type RegistryFormValues,
} from "@/components/organization/krs-registry-lookup";
import { OrganizationVerifiedBadge } from "@/components/organization/organization-verified-badge";
import { brandingLogoUrl } from "@/lib/branding-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Initial = {
  organizationName: string;
  tagline: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  organizationInfo: string | null;
  nip: string | null;
  regon: string | null;
  krs: string | null;
  legalForm: string | null;
  registryStatus: string | null;
  verifiedAt: Date | string | null;
  logoPath: string | null;
};

export function OrganizationSettingsForm({ initial }: { initial: Initial }) {
  const [pending, start] = useTransition();
  const [logoPath, setLogoPath] = useState(initial.logoPath);
  const [registry, setRegistry] = useState<RegistryFormValues>({
    organizationName: initial.organizationName,
    legalForm: initial.legalForm ?? "",
    address: initial.address ?? "",
    nip: initial.nip ?? "",
    regon: initial.regon ?? "",
    krs: initial.krs ?? "",
    registryStatus: initial.registryStatus ?? "",
  });
  const [verifiedAt, setVerifiedAt] = useState(initial.verifiedAt);
  const logoUrl = brandingLogoUrl(logoPath);

  function patchRegistry(patch: Partial<RegistryFormValues>) {
    setRegistry((prev) => ({ ...prev, ...patch }));
  }

  function onSubmitOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      organizationName: String(fd.get("organizationName") ?? ""),
      tagline: String(fd.get("tagline") ?? ""),
      contactEmail: String(fd.get("contactEmail") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      address: String(fd.get("address") ?? ""),
      organizationInfo: String(fd.get("organizationInfo") ?? ""),
      nip: registry.nip,
      regon: registry.regon,
      krs: registry.krs,
      legalForm: registry.legalForm,
      registryStatus: registry.registryStatus,
    };
    start(async () => {
      const r = await updateOrganizationProfile(body);
      if (r.ok) toast.success(r.message ?? "Zapisano.");
      else toast.error(r.error);
    });
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("logo", file);
    start(async () => {
      const r = await uploadOrganizationLogo(fd);
      if (r.ok) {
        toast.success(r.message ?? "Logo zaktualizowane.");
        if (r.logoPath) setLogoPath(r.logoPath);
      } else toast.error(r.error);
      e.target.value = "";
    });
  }

  function onRemoveLogo() {
    start(async () => {
      const r = await removeOrganizationLogo();
      if (r.ok) {
        toast.success(r.message ?? "Usunięto.");
        setLogoPath(null);
      } else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-2">
        <OrganizationVerifiedBadge
          verifiedAt={verifiedAt}
          registryStatus={registry.registryStatus}
        />
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Logo organizacji</h3>
          <p className="text-muted-foreground text-sm">
            PNG lub JPG, maks. 2 MB. Wyświetlane w panelu bocznym.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-muted flex size-20 items-center justify-center overflow-hidden rounded-xl border">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo organizacji" className="max-h-full max-w-full object-contain p-1" />
            ) : (
              <span className="text-muted-foreground text-xs">Brak</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild disabled={pending}>
              <label className="cursor-pointer">
                <Upload className="mr-1.5 size-4" />
                Wybierz plik
                <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={onLogoChange} />
              </label>
            </Button>
            {logoPath ? (
              <Button type="button" variant="ghost" size="sm" onClick={onRemoveLogo} disabled={pending}>
                <Trash2 className="mr-1.5 size-4" />
                Usuń logo
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <KrsRegistryLookup
        values={registry}
        onChange={patchRegistry}
        disabled={pending}
        onVerifiedChange={(verified) => {
          if (verified) setVerifiedAt(new Date());
        }}
        persistOnLookup={(ids) => applyOrganizationRegistryLookupAction(ids)}
      />

      {registry.krs.trim() ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const r = await reverifyOrganizationKrsAction(registry.krs);
              if (r.ok) {
                setVerifiedAt(new Date());
                if (r.profile) {
                  patchRegistry({
                    organizationName: r.profile.organizationName,
                    legalForm: r.profile.legalForm ?? "",
                    address: r.profile.address ?? "",
                    nip: r.profile.nip ?? "",
                    regon: r.profile.regon ?? "",
                    krs: r.profile.krs ?? "",
                    registryStatus: r.profile.registryStatus ?? "",
                  });
                }
                toast.success(r.message ?? "Zweryfikowano w KRS.");
              } else {
                toast.error(r.error ?? "Weryfikacja nie powiodła się.");
              }
            });
          }}
        >
          Ponów weryfikację KRS
        </Button>
      ) : null}

      <form onSubmit={onSubmitOrg} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="organizationName">Nazwa organizacji</Label>
            <Input
              id="organizationName"
              name="organizationName"
              required
              value={registry.organizationName}
              onChange={(e) => patchRegistry({ organizationName: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tagline">Krótki opis / slogan (opcjonalnie)</Label>
            <Input id="tagline" name="tagline" defaultValue={initial.tagline ?? ""} maxLength={300} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">E-mail kontaktowy</Label>
            <Input id="contactEmail" name="contactEmail" type="email" defaultValue={initial.contactEmail ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" name="phone" defaultValue={initial.phone ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Adres</Label>
            <Textarea
              id="address"
              name="address"
              rows={2}
              value={registry.address}
              onChange={(e) => patchRegistry({ address: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="legalForm">Forma prawna</Label>
            <Input
              id="legalForm"
              name="legalForm"
              readOnly
              value={registry.legalForm}
              placeholder="Pobierz dane z rejestru powyżej"
              className="bg-muted/40"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="organizationInfo">Informacje o organizacji</Label>
            <Textarea
              id="organizationInfo"
              name="organizationInfo"
              rows={4}
              defaultValue={initial.organizationInfo ?? ""}
              placeholder="Profil firmy, dział, notatki…"
            />
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Zapisywanie…" : "Zapisz dane organizacji"}
        </Button>
      </form>
    </div>
  );
}
