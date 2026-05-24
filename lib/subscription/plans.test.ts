import { describe, expect, it } from "vitest";

import {
  normalizePlanId,
  PLAN_DEFINITIONS,
  SAAS_PLAN_IDS,
} from "@/src/modules/subscription/plans";

describe("PLAN_DEFINITIONS", () => {
  it("has exactly three plans: free, pro, enterprise", () => {
    expect(SAAS_PLAN_IDS).toEqual(["free", "pro", "enterprise"]);
  });

  it("plans escalate limits monotonically", () => {
    for (let i = 1; i < SAAS_PLAN_IDS.length; i++) {
      const prev = PLAN_DEFINITIONS[SAAS_PLAN_IDS[i - 1]!].limits;
      const cur = PLAN_DEFINITIONS[SAAS_PLAN_IDS[i]!].limits;
      expect(cur.maxUsers).toBeGreaterThanOrEqual(prev.maxUsers);
      expect(cur.maxDocumentsMonthly).toBeGreaterThanOrEqual(prev.maxDocumentsMonthly);
      expect(cur.maxOcrJobsMonthly).toBeGreaterThanOrEqual(prev.maxOcrJobsMonthly);
    }
  });

  it("free plan has exact limits from pricing table", () => {
    const { limits } = PLAN_DEFINITIONS.free;
    expect(limits.maxUsers).toBe(3);
    expect(limits.maxDocumentsMonthly).toBe(25);
    expect(limits.maxOcrJobsMonthly).toBe(0);
    expect(limits.maxExportsMonthly).toBe(0);
    expect(limits.maxStorageBytes).toBe(500 * 1024 * 1024);
  });

  it("pro plan has exact limits and no enterprise-only features", () => {
    const { limits, features } = PLAN_DEFINITIONS.pro;
    expect(limits.maxUsers).toBe(25);
    expect(limits.maxDocumentsMonthly).toBe(1_000);
    expect(limits.maxOcrJobsMonthly).toBe(500);
    expect(limits.maxExportsMonthly).toBe(200);
    expect(limits.maxStorageBytes).toBe(25 * 1024 * 1024 * 1024);
    expect(features.priority_support).toBe(false);
    expect(features.api_access).toBe(false);
    expect(features.bulk_processing).toBe(false);
  });

  it("enterprise plan has exact limits and all features", () => {
    const { limits, features } = PLAN_DEFINITIONS.enterprise;
    expect(limits.maxUsers).toBe(500);
    expect(limits.maxDocumentsMonthly).toBe(50_000);
    expect(limits.maxOcrJobsMonthly).toBe(15_000);
    expect(limits.maxExportsMonthly).toBe(5_000);
    expect(limits.maxStorageBytes).toBe(500 * 1024 * 1024 * 1024);
    expect(features.priority_support).toBe(true);
    expect(features.integrations).toBe(true);
  });

  it("free plan has no OCR automation", () => {
    const free = PLAN_DEFINITIONS.free;
    expect(free.limits.maxOcrJobsMonthly).toBe(0);
    expect(free.features.invoice_ocr).toBe(false);
    expect(free.modules).not.toContain("OCR");
  });

  it("pro unlocks OCR, exports and analytics but not accounting", () => {
    const pro = PLAN_DEFINITIONS.pro;
    expect(pro.features.invoice_ocr).toBe(true);
    expect(pro.features.export_pdf).toBe(true);
    expect(pro.features.accountant_pack).toBe(false);
    expect(pro.features.integrations).toBe(false);
    expect(pro.modules).toContain("ANALYTICS");
    expect(pro.modules).not.toContain("ACCOUNTING");
  });

  it("enterprise unlocks accounting, KSeF integrations and API", () => {
    const ent = PLAN_DEFINITIONS.enterprise;
    expect(ent.modules).toContain("ACCOUNTING");
    expect(ent.features.accountant_pack).toBe(true);
    expect(ent.features.integrations).toBe(true);
    expect(ent.features.api_access).toBe(true);
  });

  it("plan modules are cumulative (each tier includes previous)", () => {
    for (let i = 1; i < SAAS_PLAN_IDS.length; i++) {
      const prev = new Set(PLAN_DEFINITIONS[SAAS_PLAN_IDS[i - 1]!].modules);
      const cur = PLAN_DEFINITIONS[SAAS_PLAN_IDS[i]!].modules;
      for (const mod of prev) {
        expect(cur).toContain(mod);
      }
    }
  });

  it("maps legacy plan ids to new tiers", () => {
    expect(normalizePlanId("starter")).toBe("pro");
    expect(normalizePlanId("business")).toBe("enterprise");
    expect(normalizePlanId("trial")).toBe("pro");
  });
});
