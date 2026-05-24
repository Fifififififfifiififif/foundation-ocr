export type FinancialOverview = {
  income: number;
  expenses: number;
  profit: number;
  accountBalance: number;
  commitments: number;
  availableFunds: number;
  currency: string;
  computedAt: Date;
};

export type BankAccountDto = {
  id?: string;
  name: string;
  iban: string | null;
  accountNumber: string | null;
  openingBalance: number;
  currentBalance: number;
  currency: string;
  isPrimary: boolean;
};
