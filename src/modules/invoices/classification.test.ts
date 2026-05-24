import { describe, expect, it } from "vitest";

import {
  resolveInvoiceClassification,
  suggestInvoiceClassification,
} from "@/src/modules/invoices/classification";
import {
  classificationForKsefDirection,
  mapKsefMetadataToInvoice,
  mapKsefStatus,
} from "@/src/modules/ksef/mapper";

describe("invoice classification", () => {
  it("suggests INCOME when org is seller", () => {
    expect(
      suggestInvoiceClassification({
        organizationNip: "5250007313",
        sellerNip: "525-000-73-13",
        buyerNip: "1234567890",
      }),
    ).toBe("INCOME");
  });

  it("suggests EXPENSE when org is buyer", () => {
    expect(
      suggestInvoiceClassification({
        organizationNip: "5250007313",
        sellerNip: "1234567890",
        buyerNip: "5250007313",
      }),
    ).toBe("EXPENSE");
  });

  it("prefers explicit classification", () => {
    expect(
      resolveInvoiceClassification({
        organizationNip: "5250007313",
        sellerNip: "5250007313",
        explicit: "EXPENSE",
      }),
    ).toBe("EXPENSE");
  });
});

describe("ksef mapper", () => {
  it("maps direction to classification", () => {
    expect(classificationForKsefDirection("issued")).toBe("INCOME");
    expect(classificationForKsefDirection("received")).toBe("EXPENSE");
  });

  it("maps metadata row", () => {
    const row = mapKsefMetadataToInvoice(
      {
        ksefReference: "ABC-123",
        invoiceNumber: "FV/1/2026",
        grossAmount: 1230,
      },
      "received",
    );
    expect(row?.ksefReference).toBe("ABC-123");
    expect(row?.invoiceNumber).toBe("FV/1/2026");
    expect(row?.amountGross).toBe(1230);
  });

  it("maps status strings", () => {
    expect(mapKsefStatus("accepted")).toBe("accepted");
    expect(mapKsefStatus("UPO ready")).toBe("upo_available");
  });
});
