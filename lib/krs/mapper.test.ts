import { describe, expect, it } from "vitest";

import { mapKrsOdpisToProfile, mapMfSubjectToProfile } from "@/src/modules/krs/mapper";

/** Fragment struktury Odpis aktualny (KRS MS API). */
const KRS_ODPIS_FIXTURE = {
  odpis: {
    naglowekA: {
      numerKRS: "0000033001",
      stanPozycji: 1,
      stanZDnia: "20.11.2025",
    },
    dane: {
      dzial1: {
        danePodmiotu: {
          nazwa: "PRZYKŁADOWA SPÓŁKA AKCYJNA",
          formaPrawna: "SPÓŁKA AKCYJNA",
          identyfikatory: {
            nip: "5272225365",
            regon: "01327954900000",
          },
        },
        siedzibaIAdres: {
          adres: {
            ulica: "PRZANOWSKIEGO",
            nrDomu: "83",
            kodPocztowy: "01-457",
            miejscowosc: "WARSZAWA",
          },
        },
      },
    },
  },
};

describe("mapKrsOdpisToProfile", () => {
  it("maps official KRS odpis fields", () => {
    const profile = mapKrsOdpisToProfile(KRS_ODPIS_FIXTURE);
    expect(profile).not.toBeNull();
    expect(profile!.organizationName).toBe("PRZYKŁADOWA SPÓŁKA AKCYJNA");
    expect(profile!.legalForm).toBe("SPÓŁKA AKCYJNA");
    expect(profile!.nip).toBe("5272225365");
    expect(profile!.krs).toBe("0000033001");
    expect(profile!.regon).toBeTruthy();
    expect(profile!.address).toContain("PRZANOWSKIEGO");
    expect(profile!.address).toContain("01-457");
    expect(profile!.registryStatus).toContain("Aktywny w KRS");
    expect(profile!.verifiedFromKrs).toBe(true);
    expect(profile!.source).toBe("krs");
  });

  it("returns null for invalid payload", () => {
    expect(mapKrsOdpisToProfile(null)).toBeNull();
    expect(mapKrsOdpisToProfile({ foo: 1 })).toBeNull();
  });
});

describe("mapMfSubjectToProfile", () => {
  it("marks MF-only data as not KRS-verified", () => {
    const profile = mapMfSubjectToProfile({
      name: "Test Sp. z o.o.",
      nip: "7010446505",
      regon: "123456785",
      krs: "0000123456",
      statusVat: "Czynny",
      workingAddress: "ul. Testowa 1, 00-001 Warszawa",
    });
    expect(profile.verifiedFromKrs).toBe(false);
    expect(profile.source).toBe("mf");
    expect(profile.organizationName).toBe("Test Sp. z o.o.");
    expect(profile.krs).toBe("0000123456");
  });
});
