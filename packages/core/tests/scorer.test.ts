/**
 * OTR Core Scoring Engine — Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  calculateTrustScore,
  scoreIdentity,
  scoreTechnical,
  scoreCompliance,
  scorePolicyScore,
  scoreWebPresence,
  scoreDataQuality,
  scoreFulfillment,
  calculateFastTrackBonus,
  assignBadge,
  assignTier,
  hasMerchantData,
  determineDataConfidence,
  detectGaming,
  PUBLIC_ASSESSMENT_WEIGHTS,
  VERIFIED_MERCHANT_WEIGHTS,
} from "../src/index";
import type { ScoringEvidence } from "../src/index";

// ============================================================================
// Test Helpers
// ============================================================================

/** Create empty evidence (all false/null) */
function emptyEvidence(): ScoringEvidence {
  return {
    hasSecFiling: false, hasStockSymbol: false, stockExchange: null,
    hasWikidataId: false, hasCorporateRegistry: false, hasWhoisData: false,
    hasParentCompany: false, hasFoundedYear: false, companyAge: null,
    hasHeadquarters: false, trancoRank: null, category: null,
    sslType: null, dmarcPolicy: null, hasSpf: false, hasDkim: false,
    hasHsts: false, hasCaa: false, hasSecurityTxt: false, hasMtaSts: false,
    complianceStatus: "PENDING", complianceEvidence: "", complianceScore: 0,
    hasPrivacyPolicy: false, privacyHasGdpr: false, privacyHasCcpa: false,
    hasRefundPolicy: false, policyReturnWindowDays: null,
    hasTermsOfService: false, hasCookieConsent: false,
    hasRobotsTxt: false, robotsAllowsCrawlers: false, hasSitemap: false,
    hasSchemaOrg: false, hasOrgSchemaComplete: false, hasMultiLang: false,
    hasViewport: false, hasFavicon: false, pageHasContent: false,
    hasProductCatalog: false, hasPricingData: false, hasInventorySync: false,
    hasRichMedia: false, hasStructuredData: false,
    hasShippingPolicy: false, hasReturnPolicy: false,
    avgDeliveryDays: null, returnWindowDays: null, hasOrderTracking: false,
  };
}

// ============================================================================
// Identity Scoring
// ============================================================================

describe("scoreIdentity", () => {
  it("returns 0 for empty evidence", () => {
    expect(scoreIdentity(emptyEvidence())).toBe(0);
  });

  it("scores NYSE listing as +20", () => {
    const e = { ...emptyEvidence(), hasSecFiling: true, hasStockSymbol: true, stockExchange: "NYSE" };
    expect(scoreIdentity(e)).toBe(20);
  });

  it("scores non-US exchange as +15", () => {
    const e = { ...emptyEvidence(), hasStockSymbol: true, stockExchange: "LSE" };
    expect(scoreIdentity(e)).toBe(15);
  });

  it("scores Wikidata as +15", () => {
    const e = { ...emptyEvidence(), hasWikidataId: true };
    expect(scoreIdentity(e)).toBe(15);
  });

  it("scores company age >= 10 as +10", () => {
    const e = { ...emptyEvidence(), hasFoundedYear: true, companyAge: 15 };
    expect(scoreIdentity(e)).toBe(10);
  });

  it("scores Tranco top 1K as +15", () => {
    const e = { ...emptyEvidence(), trancoRank: 500 };
    expect(scoreIdentity(e)).toBe(15);
  });

  it("caps at 100", () => {
    const e = {
      ...emptyEvidence(),
      hasSecFiling: true, hasStockSymbol: true, stockExchange: "NYSE",
      hasWikidataId: true, companyAge: 50, hasFoundedYear: true,
      hasHeadquarters: true, hasParentCompany: true, trancoRank: 100,
    };
    expect(scoreIdentity(e)).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// Technical Scoring
// ============================================================================

describe("scoreTechnical", () => {
  it("returns 0 for empty evidence", () => {
    expect(scoreTechnical(emptyEvidence())).toBe(0);
  });

  it("scores EV SSL as +25", () => {
    expect(scoreTechnical({ ...emptyEvidence(), sslType: "EV" })).toBe(25);
  });

  it("scores full security config correctly", () => {
    const e = {
      ...emptyEvidence(),
      sslType: "EV" as const, dmarcPolicy: "reject" as const,
      hasSpf: true, hasDkim: true, hasHsts: true,
      hasCaa: true, hasSecurityTxt: true, hasMtaSts: true,
    };
    // 25 + 20 + 15 + 10 + 10 + 5 + 5 + 5 = 95
    expect(scoreTechnical(e)).toBe(95);
  });
});

// ============================================================================
// Compliance Scoring
// ============================================================================

describe("scoreCompliance", () => {
  it("returns 0 for PENDING status", () => {
    expect(scoreCompliance(emptyEvidence())).toBe(0);
  });

  it("returns 85 for VERIFIED", () => {
    const e = { ...emptyEvidence(), complianceStatus: "VERIFIED" as const };
    expect(scoreCompliance(e)).toBe(85);
  });

  it("returns 72 for PARTIAL", () => {
    const e = { ...emptyEvidence(), complianceStatus: "PARTIAL" as const };
    expect(scoreCompliance(e)).toBe(72);
  });

  it("uses pre-computed score if available", () => {
    const e = { ...emptyEvidence(), complianceScore: 60 };
    expect(scoreCompliance(e)).toBe(60);
  });

  it("returns 50 for high-compliance industry", () => {
    const e = { ...emptyEvidence(), category: "Financial Services" };
    expect(scoreCompliance(e)).toBe(50);
  });
});

// ============================================================================
// Phase Detection
// ============================================================================

describe("hasMerchantData", () => {
  it("returns false for empty evidence", () => {
    expect(hasMerchantData(emptyEvidence())).toBe(false);
  });

  it("returns true when product catalog exists", () => {
    expect(hasMerchantData({ ...emptyEvidence(), hasProductCatalog: true })).toBe(true);
  });

  it("returns true when shipping policy exists", () => {
    expect(hasMerchantData({ ...emptyEvidence(), hasShippingPolicy: true })).toBe(true);
  });
});

// ============================================================================
// Weight Selection
// ============================================================================

describe("calculateTrustScore weight auto-detection", () => {
  it("uses Public Assessment weights when no merchant data", () => {
    const e = emptyEvidence();
    const result = calculateTrustScore(e);
    // With all zeros, score should be 0
    expect(result.trustScore).toBe(0);
    expect(result.badge).toBe("UNRATED");
  });

  it("uses Verified Merchant weights when merchant data present", () => {
    const e = { ...emptyEvidence(), hasProductCatalog: true, hasPricingData: true };
    const result = calculateTrustScore(e);
    // Only DataQuality has points: (30+25) * 0.25 = 13.75 → 14
    expect(result.trustScore).toBe(14);
  });
});

// ============================================================================
// Badge & Tier
// ============================================================================

describe("assignBadge", () => {
  it("assigns PLATINUM for 90+", () => expect(assignBadge(90)).toBe("PLATINUM"));
  it("assigns GOLD for 80-89", () => expect(assignBadge(85)).toBe("GOLD"));
  it("assigns SILVER for 70-79", () => expect(assignBadge(75)).toBe("SILVER"));
  it("assigns BRONZE for 60-69", () => expect(assignBadge(65)).toBe("BRONZE"));
  it("assigns UNRATED for <60", () => expect(assignBadge(50)).toBe("UNRATED"));
});

describe("assignTier", () => {
  it("maps PLATINUM to TIER_5", () => expect(assignTier("PLATINUM")).toBe("TIER_5"));
  it("maps UNRATED to TIER_1", () => expect(assignTier("UNRATED")).toBe("TIER_1"));
});

// ============================================================================
// Fast-Track
// ============================================================================

describe("calculateFastTrackBonus", () => {
  it("returns 0 for empty evidence", () => {
    expect(calculateFastTrackBonus(emptyEvidence())).toBe(0);
  });

  it("returns +15 for listed + top1K + wikidata", () => {
    const e = { ...emptyEvidence(), hasStockSymbol: true, trancoRank: 500, hasWikidataId: true };
    expect(calculateFastTrackBonus(e)).toBe(15);
  });

  it("returns +10 for listed + top1K without wikidata", () => {
    const e = { ...emptyEvidence(), hasStockSymbol: true, trancoRank: 500 };
    expect(calculateFastTrackBonus(e)).toBe(10);
  });

  it("returns +8 for top1K only", () => {
    const e = { ...emptyEvidence(), trancoRank: 800 };
    expect(calculateFastTrackBonus(e)).toBe(8);
  });
});

// ============================================================================
// Data Confidence
// ============================================================================

describe("determineDataConfidence", () => {
  it("returns INSUFFICIENT for null", () => {
    expect(determineDataConfidence(null)).toBe("INSUFFICIENT");
  });

  it("returns INSUFFICIENT for <1 month", () => {
    expect(determineDataConfidence(0.5)).toBe("INSUFFICIENT");
  });

  it("returns LOW_CONFIDENCE for 1-3 months", () => {
    expect(determineDataConfidence(2)).toBe("LOW_CONFIDENCE");
  });

  it("returns HIGH_CONFIDENCE for 3+ months", () => {
    expect(determineDataConfidence(6)).toBe("HIGH_CONFIDENCE");
  });
});

// ============================================================================
// Anti-Gaming Detection
// ============================================================================

describe("detectGaming", () => {
  it("returns CLEAN for legitimate brand", () => {
    const e = { ...emptyEvidence(), hasWikidataId: true, hasStockSymbol: true };
    const dims = { identity: 50, technical: 80, compliance: 0, policyScore: 70, webPresence: 60, dataQuality: 0, fulfillment: 0 };
    const result = detectGaming(e, dims);
    expect(result.severity).toBe("CLEAN");
    expect(result.multiplier).toBe(1.0);
  });

  it("detects signal-brand mismatch", () => {
    const e = { ...emptyEvidence(), companyAge: 1 };
    const dims = { identity: 0, technical: 90, compliance: 0, policyScore: 90, webPresence: 85, dataQuality: 0, fulfillment: 0 };
    const result = detectGaming(e, dims);
    expect(result.severity).not.toBe("CLEAN");
    expect(result.multiplier).toBeLessThan(1.0);
    expect(result.patterns.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Determinism
// ============================================================================

describe("determinism", () => {
  it("produces identical output for identical input across 100 runs", () => {
    const e = {
      ...emptyEvidence(),
      hasSecFiling: true, hasStockSymbol: true, stockExchange: "NYSE",
      hasWikidataId: true, trancoRank: 500, companyAge: 30, hasFoundedYear: true,
      sslType: "OV" as const, dmarcPolicy: "reject" as const, hasSpf: true,
    };

    const first = calculateTrustScore(e);
    for (let i = 0; i < 100; i++) {
      const result = calculateTrustScore(e);
      expect(result.trustScore).toBe(first.trustScore);
      expect(result.badge).toBe(first.badge);
      expect(result.dimensions).toEqual(first.dimensions);
    }
  });
});

// ============================================================================
// Fairness: Score NOT linked to time
// ============================================================================

describe("scoring fairness", () => {
  it("scores are identical regardless of dataAgeMonths", () => {
    const e = {
      ...emptyEvidence(),
      hasProductCatalog: true, hasPricingData: true,
      hasShippingPolicy: true, hasReturnPolicy: true,
      avgDeliveryDays: 3, returnWindowDays: 30, hasOrderTracking: true,
    };

    const score1Month = calculateTrustScore(e, undefined, 1);
    const score12Months = calculateTrustScore(e, undefined, 12);

    // Score MUST be identical — only confidence label differs
    expect(score1Month.trustScore).toBe(score12Months.trustScore);
    expect(score1Month.badge).toBe(score12Months.badge);

    // Confidence labels differ
    expect(score1Month.dataConfidence).toBe("LOW_CONFIDENCE");
    expect(score12Months.dataConfidence).toBe("HIGH_CONFIDENCE");
  });
});
