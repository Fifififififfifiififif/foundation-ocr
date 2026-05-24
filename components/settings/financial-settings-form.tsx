"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { saveFinancialSettingsAction } from "@/app/actions/finance";
import { rethrowNextNavigation } from "@/lib/rethrow-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BankAccountDto } from "@/src/modules/finance/types";

type Props = {
  initial: {
    reservedCommitments: number;
    notes: string | null;
    accounts: BankAccountDto[];
  };
};

type AccountRow = BankAccountDto & { id?: string };

function defaultAccounts(accounts: BankAccountDto[]): AccountRow[] {
  if (accounts.length > 0) return accounts;
  return [
    {
      name: "Konto główne",
      currentBalance: 0,
      openingBalance: 0,
      currency: "PLN",
      isPrimary: true,
      iban: null,
      accountNumber: null,
    },
  ];
}

export function FinancialSettingsForm({ initial }: Props) {
  const [pending, start] = useTransition();
  const [reservedCommitments, setReservedCommitments] = useState(String(initial.reservedCommitments));
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [accounts, setAccounts] = useState<AccountRow[]>(defaultAccounts(initial.accounts));

  function updateAccount(index: number, patch: Partial<AccountRow>) {
    setAccounts((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addAccount() {
    setAccounts((rows) => [
      ...rows,
      {
        name: "",
        currentBalance: 0,
        openingBalance: 0,
        currency: "PLN",
        isPrimary: false,
        iban: null,
        accountNumber: null,
      },
    ]);
  }

  function removeAccount(index: number) {
    setAccounts((rows) => rows.filter((_, i) => i !== index));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        const result = await saveFinancialSettingsAction({
          reservedCommitments: Number(reservedCommitments) || 0,
          notes,
          accounts: accounts.map((a, i) => ({
            id: a.id,
            name: a.name,
            iban: a.iban ?? "",
            accountNumber: a.accountNumber ?? "",
            openingBalance: a.openingBalance,
            currentBalance: a.currentBalance,
            currency: a.currency || "PLN",
            isPrimary: a.isPrimary || i === 0,
          })),
        });
        if (result.ok) toast.success(result.message ?? "Zapisano.");
        else toast.error(result.error);
      } catch (e) {
        rethrowNextNavigation(e);
        toast.error(e instanceof Error ? e.message : "Nie udało się zapisać ustawień.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Zobowiązania</h3>
          <p className="text-muted-foreground text-sm">
            Ręcznie zarezerwowane kwoty odejmowane od dostępnych środków.
          </p>
        </div>
        <div className="grid max-w-md gap-4">
          <div className="space-y-2">
            <Label htmlFor="reservedCommitments">Zobowiązania (PLN)</Label>
            <Input
              id="reservedCommitments"
              type="number"
              step="0.01"
              value={reservedCommitments}
              onChange={(e) => setReservedCommitments(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notatki</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Rachunki bankowe</h3>
            <p className="text-muted-foreground text-sm">Ręczna konfiguracja sald kont.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addAccount}>
            <Plus className="mr-1 size-4" />
            Dodaj konto
          </Button>
        </div>
        <div className="space-y-4">
          {accounts.map((acc, index) => (
            <div key={acc.id ?? index} className="border-border grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nazwa konta</Label>
                <Input value={acc.name} onChange={(e) => updateAccount(index, { name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input value={acc.iban ?? ""} onChange={(e) => updateAccount(index, { iban: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Numer rachunku</Label>
                <Input
                  value={acc.accountNumber ?? ""}
                  onChange={(e) => updateAccount(index, { accountNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Saldo początkowe</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={acc.openingBalance}
                  onChange={(e) => updateAccount(index, { openingBalance: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bieżące saldo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={acc.currentBalance}
                  onChange={(e) => updateAccount(index, { currentBalance: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-end justify-end sm:col-span-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => removeAccount(index)}>
                  <Trash2 className="mr-1 size-4" />
                  Usuń
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Zapisywanie…" : "Zapisz ustawienia finansowe"}
      </Button>
    </form>
  );
}
