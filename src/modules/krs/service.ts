import { Prisma } from "@/generated/prisma";
import {
  fetchKrsOdpisAktualny,
  fetchMfSubjectByNip,
  fetchMfSubjectByRegon,
} from "@/src/modules/krs/client";
import { mapKrsOdpisToProfile, mapMfSubjectToProfile, mergeProfiles } from "@/src/modules/krs/mapper";
import type { KrsLookupInput, KrsLookupResult, KrsRejestr, OrganizationRegistryProfile } from "@/src/modules/krs/types";
import { validateLookupIdentifiers } from "@/src/modules/krs/validation";

export async function lookupOrganizationRegistry(
  input: KrsLookupInput,
): Promise<KrsLookupResult> {
  const validated = validateLookupIdentifiers({
    krs: input.krs,
    nip: input.nip,
    regon: input.regon,
  });
  if (!validated.ok) {
    return { ok: false, code: "VALIDATION", message: validated.message };
  }

  const rejestr: KrsRejestr = input.rejestr ?? "P";

  if (validated.krs) {
    return lookupByKrsNumber(validated.krs, rejestr);
  }

  if (validated.nip) {
    const mf = await fetchMfSubjectByNip(validated.nip);
    if (!mf.ok) return { ok: false, code: "MF_NOT_FOUND", message: mf.message };
    const mfProfile = mapMfSubjectToProfile(mf.subject);
    if (mfProfile.krs) {
      const krsResult = await lookupByKrsNumber(mfProfile.krs, rejestr);
      if (krsResult.ok) {
        return {
          ok: true,
          profile: mergeProfiles(krsResult.profile, mfProfile),
          registryRawData: krsResult.registryRawData,
        };
      }
    }
    return {
      ok: true,
      profile: { ...mfProfile, source: "mf" },
      registryRawData: { mf: mf.subject },
    };
  }

  if (validated.regon) {
    const mf = await fetchMfSubjectByRegon(validated.regon);
    if (!mf.ok) return { ok: false, code: "MF_NOT_FOUND", message: mf.message };
    const mfProfile = mapMfSubjectToProfile(mf.subject);
    if (mfProfile.krs) {
      const krsResult = await lookupByKrsNumber(mfProfile.krs, rejestr);
      if (krsResult.ok) {
        return {
          ok: true,
          profile: mergeProfiles(krsResult.profile, mfProfile),
          registryRawData: krsResult.registryRawData,
        };
      }
    }
    return {
      ok: true,
      profile: { ...mfProfile, source: "mf" },
      registryRawData: { mf: mf.subject },
    };
  }

  return { ok: false, code: "VALIDATION", message: "Brak identyfikatora do wyszukania." };
}

async function lookupByKrsNumber(krs: string, rejestr: KrsRejestr): Promise<KrsLookupResult> {
  const res = await fetchKrsOdpisAktualny(krs, rejestr);
  if (!res.ok) {
    return {
      ok: false,
      code: res.status === 404 ? "KRS_NOT_FOUND" : "KRS_ERROR",
      message: res.message,
    };
  }

  const profile = mapKrsOdpisToProfile(res.payload);
  if (!profile) {
    return {
      ok: false,
      code: "KRS_PARSE",
      message: "Nie udało się odczytać danych z odpisu KRS.",
    };
  }

  return { ok: true, profile, registryRawData: res.payload };
}

/** Dane do zapisu w `organization` po udanej weryfikacji KRS. */
export function registryProfileToOrganizationData(
  profile: OrganizationRegistryProfile,
  registryRawData?: unknown | null,
) {
  return {
    name: profile.organizationName,
    nip: profile.nip,
    regon: profile.regon,
    krs: profile.krs,
    legalForm: profile.legalForm,
    registryStatus: profile.registryStatus,
    address: profile.address,
    verifiedAt: profile.verifiedFromKrs ? new Date() : null,
    registryRawData:
      registryRawData === undefined
        ? undefined
        : registryRawData === null
          ? Prisma.DbNull
          : (registryRawData as Prisma.InputJsonValue),
  };
}

export async function verifyOrganizationByKrsOnServer(krs: string): Promise<{
  profile: OrganizationRegistryProfile;
  registryRawData: unknown;
} | null> {
  const result = await lookupByKrsNumber(krs, "P");
  if (!result.ok || !result.profile.verifiedFromKrs) return null;
  return {
    profile: result.profile,
    registryRawData: result.registryRawData ?? null,
  };
}
