export type KrsRejestr = "P" | "S";

export type KrsLookupInput = {
  krs?: string;
  nip?: string;
  regon?: string;
  rejestr?: KrsRejestr;
};

export type OrganizationRegistryProfile = {
  organizationName: string;
  legalForm: string | null;
  address: string | null;
  nip: string | null;
  regon: string | null;
  krs: string | null;
  registryStatus: string | null;
  /** Dane z oficjalnego API KRS (Odpis aktualny). */
  verifiedFromKrs: boolean;
  /** Źródło odpowiedzi dla UI. */
  source: "krs" | "mf" | "krs+mf";
};

export type KrsLookupResult =
  | { ok: true; profile: OrganizationRegistryProfile; registryRawData: unknown | null }
  | { ok: false; code: string; message: string };

export type MfSubject = {
  name?: string;
  nip?: string;
  regon?: string;
  krs?: string;
  statusVat?: string;
  workingAddress?: string | null;
  residenceAddress?: string | null;
};
