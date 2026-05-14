"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

import {
  removeFoundationLogo,
  updateFoundationOrg,
  uploadFoundationLogo,
} from "@/app/actions/foundation-settings";
import { brandingLogoUrl } from "@/lib/branding-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Initial = {
  foundationName: string;
  tagline: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  organizationInfo: string | null;
  nip: string | null;
  regon: string | null;
  krs: string | null;
  logoPath: string | null;
};

export function FoundationSettingsForm({ initial }: { initial: Initial }) {
  const [pending, start] = useTransition();
  const [logoPath, setLogoPath] = useState(initial.logoPath);
  const logoUrl = brandingLogoUrl(logoPath);

  function onSubmitOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      foundationName: String(fd.get("foundationName") ?? ""),
      tagline: String(fd.get("tagline") ?? ""),
      contactEmail: String(fd.get("contactEmail") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      address: String(fd.get("address") ?? ""),
      organizationInfo: String(fd.get("organizationInfo") ?? ""),
      nip: String(fd.get("nip") ?? ""),
      regon: String(fd.get("regon") ?? ""),
      krs: String(fd.get("krs") ?? ""),
    };
    start(async () => {
      const r = await updateFoundationOrg(body);
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
      const r = await uploadFoundationLogo(fd);
      if (r.ok) {
        toast.success(r.message ?? "Logo zaktualizowane.");
        if (r.logoPath) setLogoPath(r.logoPath);
      } else toast.error(r.error);
      e.target.value = "";
    });
  }

  function onRemoveLogo() {
    start(async () => {
      const r = await removeFoundationLogo();
      if (r.ok) {
        toast.success(r.message ?? "Usunięto.");
        setLogoPath(null);
      } else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Logo fundacji</h3>
          <p className="text-muted-foreground text-sm">
            PNG lub JPG, maks. 2 MB. Wyświetlane w panelu bocznym i na stronie logowania.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-muted flex size-20 items-center justify-center overflow-hidden rounded-xl border">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- public branding endpoint, cache-bust friendly
              <img src={logoUrl} alt="Logo fundacji" className="max-h-full max-w-full object-contain p-1" />
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

      <form onSubmit={onSubmitOrg} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="foundationName">Nazwa fundacji</Label>
            <Input id="foundationName" name="foundationName" defaultValue={initial.foundationName} required />
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
            <Textarea id="address" name="address" rows={2} defaultValue={initial.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nip">NIP</Label>
            <Input id="nip" name="nip" defaultValue={initial.nip ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="regon">REGON</Label>
            <Input id="regon" name="regon" defaultValue={initial.regon ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="krs">KRS</Label>
            <Input id="krs" name="krs" defaultValue={initial.krs ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="organizationInfo">Informacje o organizacji</Label>
            <Textarea
              id="organizationInfo"
              name="organizationInfo"
              rows={4}
              defaultValue={initial.organizationInfo ?? ""}
              placeholder="Misja, cele statutowe, nota prawna…"
            />
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Zapisywanie…" : "Zapisz dane fundacji"}
        </Button>
      </form>
    </div>
  );
}
