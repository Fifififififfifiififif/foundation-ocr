import type { MfSubject, OrganizationRegistryProfile } from "@/src/modules/krs/types";
import { normalizeKrs, normalizeNip, normalizeRegon } from "@/src/modules/krs/validation";

const STAN_POZYCJI_LABELS: Record<number, string> = {
  1: "Aktywny w KRS",
  2: "Wykreślony z KRS",
  3: "W likwidacji",
  4: "W upadłości",
};

function pickString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function formatAddressFromKrs(siedzibaIAdres: unknown): string | null {
  if (!siedzibaIAdres || typeof siedzibaIAdres !== "object") return null;
  const rec = siedzibaIAdres as Record<string, unknown>;
  const adres = rec.adres as Record<string, unknown> | undefined;
  if (!adres) return null;

  const ulica = pickString(adres.ulica);
  const nrDomu = pickString(adres.nrDomu);
  const nrLokalu = pickString(adres.nrLokalu);
  const kod = pickString(adres.kodPocztowy);
  const miasto = pickString(adres.miejscowosc) ?? pickString(adres.poczta);

  const line1 = [ulica, nrDomu, nrLokalu && `lok. ${nrLokalu}`].filter(Boolean).join(" ");
  const line2 = [kod, miasto].filter(Boolean).join(" ");
  const joined = [line1, line2].filter(Boolean).join(", ");
  return joined || null;
}

/** Mapowanie oficjalnego JSON „Odpis aktualny” KRS → profil organizacji. */
export function mapKrsOdpisToProfile(payload: unknown): OrganizationRegistryProfile | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const odpis = root.odpis as Record<string, unknown> | undefined;
  if (!odpis) return null;

  const naglowek = odpis.naglowekA as Record<string, unknown> | undefined;
  const dane = odpis.dane as Record<string, unknown> | undefined;
  const dzial1 = dane?.dzial1 as Record<string, unknown> | undefined;
  const danePodmiotu = dzial1?.danePodmiotu as Record<string, unknown> | undefined;
  if (!danePodmiotu) return null;

  const ident = danePodmiotu.identyfikatory as Record<string, unknown> | undefined;
  const numerKrs = normalizeKrs(pickString(naglowek?.numerKRS) ?? "");
  const nip = ident?.nip ? normalizeNip(String(ident.nip)) : null;
  const regonRaw = ident?.regon ? String(ident.regon) : "";
  const regon = regonRaw ? normalizeRegon(regonRaw) ?? regonRaw.replace(/\D/g, "").slice(0, 14) : null;

  const stan = typeof naglowek?.stanPozycji === "number" ? naglowek.stanPozycji : null;
  const registryStatus =
    stan != null && STAN_POZYCJI_LABELS[stan]
      ? STAN_POZYCJI_LABELS[stan]
      : stan != null
        ? `Stan rejestru: ${stan}`
        : "Wpisanie w KRS";

  const stanZDnia = pickString(naglowek?.stanZDnia);
  const statusWithDate = stanZDnia ? `${registryStatus} (stan z ${stanZDnia})` : registryStatus;

  return {
    organizationName: pickString(danePodmiotu.nazwa) ?? "Organizacja",
    legalForm: pickString(danePodmiotu.formaPrawna),
    address: formatAddressFromKrs(dzial1?.siedzibaIAdres),
    nip,
    regon,
    krs: numerKrs,
    registryStatus: statusWithDate,
    verifiedFromKrs: true,
    source: "krs",
  };
}

export function mapMfSubjectToProfile(subject: MfSubject): OrganizationRegistryProfile {
  const krs = subject.krs ? normalizeKrs(subject.krs) : null;
  const nip = subject.nip ? normalizeNip(subject.nip) : null;
  const regon = subject.regon ? normalizeRegon(subject.regon) ?? subject.regon.replace(/\D/g, "") : null;
  const address = subject.workingAddress?.trim() || subject.residenceAddress?.trim() || null;
  const vat = subject.statusVat?.trim();

  return {
    organizationName: subject.name?.trim() ?? "Organizacja",
    legalForm: null,
    address,
    nip,
    regon,
    krs,
    registryStatus: vat ? `Status VAT: ${vat}` : "Dane z rejestru podatkowego",
    verifiedFromKrs: false,
    source: "mf",
  };
}

export function mergeProfiles(
  primary: OrganizationRegistryProfile,
  secondary: OrganizationRegistryProfile,
): OrganizationRegistryProfile {
  return {
    organizationName: primary.organizationName || secondary.organizationName,
    legalForm: primary.legalForm ?? secondary.legalForm,
    address: primary.address ?? secondary.address,
    nip: primary.nip ?? secondary.nip,
    regon: primary.regon ?? secondary.regon,
    krs: primary.krs ?? secondary.krs,
    registryStatus: primary.registryStatus ?? secondary.registryStatus,
    verifiedFromKrs: primary.verifiedFromKrs || secondary.verifiedFromKrs,
    source:
      primary.verifiedFromKrs && secondary.source === "mf"
        ? "krs+mf"
        : primary.verifiedFromKrs
          ? "krs"
          : secondary.verifiedFromKrs
            ? "krs"
            : "mf",
  };
}
