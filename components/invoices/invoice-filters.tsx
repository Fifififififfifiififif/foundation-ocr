"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { documentStatusPl } from "@/lib/ui-i18n";

type Opt = { id: string; name: string };

type Props = {
  projects: Opt[];
  contractors: Opt[];
  isAdmin: boolean;
  defaults: {
    q: string;
    projectId: string;
    contractorId: string;
    status: string;
    from: string;
    to: string;
    minGross: string;
    maxGross: string;
    sort: string;
    archived: string;
    noProject: string;
    noContractor: string;
  };
};

export function InvoiceFilters({ projects, contractors, isAdmin, defaults }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const push = (patch: Record<string, string>) => {
    const n = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) n.set(k, v);
      else n.delete(k);
    }
    n.delete("page");
    router.push(`/documents?${n.toString()}`);
  };

  const fromDate = defaults.from ? new Date(defaults.from) : undefined;
  const toDate = defaults.to ? new Date(defaults.to) : undefined;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Filtry</CardTitle>
        <CardDescription>Wyszukiwanie, zakres dat, kwoty i sortowanie</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label>Szukaj</Label>
          <div className="flex gap-2">
            <Input
              defaultValue={defaults.q}
              placeholder="Numer, plik, kontrahent…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  push({ q: (e.target as HTMLInputElement).value });
                }
              }}
              id="invoice-q"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const el = document.getElementById("invoice-q") as HTMLInputElement | null;
                push({ q: el?.value ?? "" });
              }}
            >
              Szukaj
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Projekt</Label>
          <Select
            value={defaults.projectId || "all"}
            onValueChange={(v) =>
              push({ projectId: v === "all" ? "" : v, noProject: "" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Wszystkie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Kontrahent</Label>
          <Select
            value={defaults.contractorId || "all"}
            onValueChange={(v) =>
              push({ contractorId: v === "all" ? "" : v, noContractor: "" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Wszyscy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy</SelectItem>
              {contractors.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 lg:col-span-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="inv-no-project"
              checked={defaults.noProject === "1"}
              onCheckedChange={(c) =>
                push({
                  noProject: c === true ? "1" : "",
                  projectId: c === true ? "" : defaults.projectId,
                })
              }
            />
            <Label htmlFor="inv-no-project" className="cursor-pointer text-sm font-normal">
              Tylko bez projektu
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="inv-no-contractor"
              checked={defaults.noContractor === "1"}
              onCheckedChange={(c) =>
                push({
                  noContractor: c === true ? "1" : "",
                  contractorId: c === true ? "" : defaults.contractorId,
                })
              }
            />
            <Label htmlFor="inv-no-contractor" className="cursor-pointer text-sm font-normal">
              Tylko bez kontrahenta
            </Label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={defaults.status || "all"}
            onValueChange={(v) => push({ status: v === "all" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wszystkie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="draft">{documentStatusPl("draft")}</SelectItem>
              <SelectItem value="review">{documentStatusPl("review")}</SelectItem>
              <SelectItem value="approved">{documentStatusPl("approved")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Data wystawienia od</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal">
                {fromDate ? format(fromDate, "dd.MM.yyyy") : "Wybierz…"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(d) => push({ from: d ? format(d, "yyyy-MM-dd") : "" })}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label>Data wystawienia do</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal">
                {toDate ? format(toDate, "dd.MM.yyyy") : "Wybierz…"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(d) => push({ to: d ? format(d, "yyyy-MM-dd") : "" })}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="minGross">Kwota brutto od</Label>
          <Input
            id="minGross"
            defaultValue={defaults.minGross}
            inputMode="decimal"
            onBlur={(e) => push({ minGross: e.target.value.trim() })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="maxGross">Kwota brutto do</Label>
          <Input
            id="maxGross"
            defaultValue={defaults.maxGross}
            inputMode="decimal"
            onBlur={(e) => push({ maxGross: e.target.value.trim() })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Sortowanie</Label>
          <Select value={defaults.sort || "created_desc"} onValueChange={(v) => push({ sort: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Data dodania ↓</SelectItem>
              <SelectItem value="created_asc">Data dodania ↑</SelectItem>
              <SelectItem value="gross_desc">Kwota brutto ↓</SelectItem>
              <SelectItem value="gross_asc">Kwota brutto ↑</SelectItem>
              <SelectItem value="issue_desc">Data wystawienia ↓</SelectItem>
              <SelectItem value="issue_asc">Data wystawienia ↑</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isAdmin && (
          <div className="space-y-1.5">
            <Label>Archiwum</Label>
            <Select
              value={defaults.archived === "1" ? "yes" : "no"}
              onValueChange={(v) => push({ archived: v === "yes" ? "1" : "" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Ukryj zarchiwizowane</SelectItem>
                <SelectItem value="yes">Pokaż tylko zarchiwizowane</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-end gap-2 lg:col-span-2">
          <Button type="button" variant="outline" onClick={() => router.push("/documents")}>
            Wyczyść filtry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
