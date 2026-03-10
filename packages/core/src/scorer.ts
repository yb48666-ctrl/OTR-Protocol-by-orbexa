/**
 * ============================================================================
 * OTR Protocol v3 — Deterministic Trust Scoring Engine
 * ============================================================================
 *
 * Pure, deterministic scoring: same inputs → identical outputs, always.
 * No randomness, no external state, no side effects.
 *
 * 7-Dimension Trust Model:
 * 1. Identity     — Who is this merchant? (unforgeable signals)
 * 2. Technical    — Is the site technically secure?
 * 3. Compliance   — Does the merchant meet regulatory standards?
 * 4. PolicyScore  — Are consumer policies complete and transparent?
 * 5. WebPresence  — Is the website professionally maintained?
 * 6. DataQuality  — How good is the product data? (requires API)
 * 7. Fulfillment  — Can they actually deliver? (requires API)
 *
 * Scoring Phases:
 * - Public Assessment: Identity(0.55) + Technical(0.15) + Policy(0.15) + Web(0.15)
 * - Verified Merchant: All 7 dims with Fulfillment(0.35) + DataQuality(0.25)
 *
 * @version 3.0.0
 */

import type {
  ScoringEvidence,
  TrustDimensions,
  ScoringWeights,
  ScoreResult,
  Badge,
  Tier,
  DataConfidence,
  VerificationData,
  TierDetail,
} from "./types";

import {
  PUBLIC_ASSESSMENT_WEIGHTS,
  VERIFIED_MERCHANT_WEIGHTS,
  BADGE_THRESHOLDS,
  TRUST_SCORE_AUTO_CAP,
  BRAND_FAST_TRACK,
  TRANCO_TIERS,
  US_EXCHANGES,
  HIGH_COMPLIANCE_INDUSTRIES,
  MID_COMPLIANCE_INDUSTRIES,
} from "./constants";

// ============================================================================
// Dimension Scoring Functions
// ============================================================================

/**
 * Score Identity dimension (0-100).
 *
 * Measures unforgeable brand identity signals:
 * - SEC filing / stock exchange listing (+20/+15)
 * - Wikidata entity (+15)
 * - Company age (+10/+5)
 * - Headquarters data (+5)
 * - Parent company (+10)
 * - Tranco rank (tiered, up to +15)
 */
export function scoreIdentity(evidence: ScoringEvidence): number {
  let score = 0;

  // Stock exchange listing
  if (isUsExchange(evidence.stockExchange)) {
    score += 20; // NYSE/NASDAQ = SEC-regulated
  } else if (evidence.hasStockSymbol) {
    score += 15; // Other exchange
  }

  // Wikidata presence
  if (evidence.hasWikidataId) score += 15;

  // Company age
  if (evidence.companyAge !== null) {
    if (evidence.companyAge >= 10) {
      score += 10;
    } else if (evidence.hasFoundedYear) {
      score += 5;
    }
  }

  // Headquarters data
  if (evidence.hasHeadquarters) score += 5;

  // Parent company
  if (evidence.hasParentCompany) score += 10;

  // Tranco rank
  if (evidence.trancoRank !== null) {
    for (const tier of TRANCO_TIERS) {
      if (evidence.trancoRank <= tier.maxRank) {
        score += tier.points;
        break;
      }
    }
  }

  return clamp(score, 0, 100);
}

/**
 * Score Technical dimension (0-100).
 *
 * Measures DNS/SSL security configuration:
 * - EV SSL (+25) / DV/OV SSL (+15)
 * - DMARC reject (+20) / quarantine (+15)
 * - SPF (+15), DKIM (+10), HSTS (+10)
 * - CAA (+5), security.txt (+5), MTA-STS (+5)
 */
export function scoreTechnical(evidence: ScoringEvidence): number {
  let score = 0;

  // SSL certificate
  if (evidence.sslType === "EV") {
    score += 25;
  } else if (evidence.sslType === "OV" || evidence.sslType === "DV") {
    score += 15;
  }

  // DMARC policy
  if (evidence.dmarcPolicy === "reject") {
    score += 20;
  } else if (evidence.dmarcPolicy === "quarantine") {
    score += 15;
  }

  // Email security
  if (evidence.hasSpf) score += 15;
  if (evidence.hasDkim) score += 10;

  // Transport security
  if (evidence.hasHsts) score += 10;

  // Advanced security
  if (evidence.hasCaa) score += 5;
  if (evidence.hasSecurityTxt) score += 5;
  if (evidence.hasMtaSts) score += 5;

  return clamp(score, 0, 100);
}

/**
 * Score Compliance dimension (0-100).
 *
 * Status-based model:
 * - VERIFIED (audit passed) → 85
 * - PARTIAL (some evidence) → 72
 * - High compliance industry (inferred) → 50 (restored baseline)
 * - PENDING → 0
 *
 * If a pre-computed complianceScore > 0 exists, use it directly.
 */
export function scoreCompliance(evidence: ScoringEvidence): number {
  // Use pre-computed score if available
  if (evidence.complianceScore > 0) return clamp(evidence.complianceScore, 0, 100);

  // Status-based fallback
  if (evidence.complianceStatus === "VERIFIED") return 85;
  if (evidence.complianceStatus === "PARTIAL") return 72;

  // Industry inference — high-compliance industries get baseline
  if (isHighComplianceIndustry(evidence.category)) return 50;

  return 0;
}

/**
 * Score PolicyScore dimension (0-100).
 *
 * Measures consumer policy completeness via real website scans:
 * - Privacy policy (+20)
 * - GDPR provisions (+10)
 * - CCPA provisions (+10)
 * - Refund policy (+20)
 * - Return window >= 30 days (+5)
 * - Terms of service (+15)
 * - Cookie consent (+10)
 */
export function scorePolicyScore(evidence: ScoringEvidence): number {
  let score = 0;

  if (evidence.hasPrivacyPolicy) score += 20;
  if (evidence.privacyHasGdpr) score += 10;
  if (evidence.privacyHasCcpa) score += 10;
  if (evidence.hasRefundPolicy) score += 20;
  if (evidence.policyReturnWindowDays !== null && evidence.policyReturnWindowDays >= 30) {
    score += 5;
  }
  if (evidence.hasTermsOfService) score += 15;
  if (evidence.hasCookieConsent) score += 10;

  return clamp(score, 0, 100);
}

/**
 * Score WebPresence dimension (0-100).
 *
 * Measures website professionalism and discoverability:
 * - robots.txt (+10), allows crawlers (+5)
 * - sitemap.xml (+10)
 * - Schema.org JSON-LD (+15)
 * - Organization schema complete (+10)
 * - Multi-language (hreflang) (+5)
 * - Viewport meta (+5)
 * - Favicon (+5)
 * - Page has content (+20)
 *
 * Phase 2 (future): AI crawler friendliness (+10), llms.txt (+5)
 */
export function scoreWebPresence(evidence: ScoringEvidence): number {
  let score = 0;

  if (evidence.hasRobotsTxt) score += 10;
  if (evidence.robotsAllowsCrawlers) score += 5;
  if (evidence.hasSitemap) score += 10;
  if (evidence.hasSchemaOrg) score += 15;
  if (evidence.hasOrgSchemaComplete) score += 10;
  if (evidence.hasMultiLang) score += 5;
  if (evidence.hasViewport) score += 5;
  if (evidence.hasFavicon) score += 5;
  if (evidence.pageHasContent) score += 20;

  return clamp(score, 0, 100);
}

/**
 * Score DataQuality dimension (0-100).
 *
 * Measures product data completeness (requires Verified Merchant API):
 * - Product catalog (+30)
 * - Pricing data (+25)
 * - Inventory sync (+20)
 * - Rich media (+15)
 * - Structured data (+10)
 */
export function scoreDataQuality(evidence: ScoringEvidence): number {
  let score = 0;

  if (evidence.hasProductCatalog) score += 30;
  if (evidence.hasPricingData) score += 25;
  if (evidence.hasInventorySync) score += 20;
  if (evidence.hasRichMedia) score += 15;
  if (evidence.hasStructuredData) score += 10;

  return clamp(score, 0, 100);
}

/**
 * Score Fulfillment dimension (0-100).
 *
 * Measures fulfillment capability (requires Verified Merchant API):
 * - Shipping policy (+25)
 * - Return policy (+25)
 * - Delivery < 5 days (+20)
 * - Return window >= 30 days (+15)
 * - Order tracking (+15)
 */
export function scoreFulfillment(evidence: ScoringEvidence): number {
  let score = 0;

  if (evidence.hasShippingPolicy) score += 25;
  if (evidence.hasReturnPolicy) score += 25;
  if (evidence.avgDeliveryDays !== null && evidence.avgDeliveryDays < 5) score += 20;
  if (evidence.returnWindowDays !== null && evidence.returnWindowDays >= 30) score += 15;
  if (evidence.hasOrderTracking) score += 15;

  return clamp(score, 0, 100);
}

// ============================================================================
// Brand Fast-Track Bonus
// ============================================================================

/**
 * Calculate Brand Fast-Track bonus points.
 *
 * Major, independently verifiable brands get bonus points:
 * - Listed + Top 1K + Wikidata → +15
 * - Listed + Top 1K (no Wikidata) → +10
 * - Listed only → +10
 * - Top 1K only → +8
 */
export function calculateFastTrackBonus(evidence: ScoringEvidence): number {
  if (!BRAND_FAST_TRACK.enabled) return 0;

  const isListed = evidence.hasStockSymbol;
  const isTop1K = evidence.trancoRank !== null && evidence.trancoRank <= 1000;
  const hasWikidata = evidence.hasWikidataId;

  if (isListed && isTop1K && hasWikidata) return BRAND_FAST_TRACK.listedAndTop1KAndWikidata;
  if (isListed && isTop1K) return BRAND_FAST_TRACK.listedAndTop1KNoWikidata;
  if (isListed) return BRAND_FAST_TRACK.listedOnly;
  if (isTop1K) return BRAND_FAST_TRACK.top1KOnly;

  return 0;
}

// ============================================================================
// Badge & Tier Assignment
// ============================================================================

/** Assign trust badge based on composite score */
export function assignBadge(trustScore: number): Badge {
  if (trustScore >= BADGE_THRESHOLDS.PLATINUM) return "PLATINUM";
  if (trustScore >= BADGE_THRESHOLDS.GOLD) return "GOLD";
  if (trustScore >= BADGE_THRESHOLDS.SILVER) return "SILVER";
  if (trustScore >= BADGE_THRESHOLDS.BRONZE) return "BRONZE";
  return "UNRATED";
}

/** Assign trust tier based on badge */
export function assignTier(badge: Badge): Tier {
  switch (badge) {
    case "PLATINUM": return "TIER_5";
    case "GOLD": return "TIER_4";
    case "SILVER": return "TIER_3";
    case "BRONZE": return "TIER_2";
    default: return "TIER_1";
  }
}

// ============================================================================
// Merchant Data Detection
// ============================================================================

/**
 * Detect whether merchant has provided verified API data.
 *
 * If any DataQuality or Fulfillment evidence exists,
 * the merchant has integrated via API → use Verified Merchant weights.
 */
export function hasMerchantData(evidence: ScoringEvidence): boolean {
  return (
    evidence.hasProductCatalog ||
    evidence.hasPricingData ||
    evidence.hasInventorySync ||
    evidence.hasRichMedia ||
    evidence.hasStructuredData ||
    evidence.hasShippingPolicy ||
    evidence.hasReturnPolicy ||
    evidence.hasOrderTracking ||
    evidence.avgDeliveryDays !== null ||
    evidence.returnWindowDays !== null
  );
}

// ============================================================================
// Data Confidence Label
// ============================================================================

/**
 * Determine data confidence label.
 *
 * IMPORTANT: This label does NOT affect scoring.
 * It tells AI agents how much data supports the score.
 *
 * @param dataAgeMonths - How many months of verified data exists
 */
export function determineDataConfidence(dataAgeMonths: number | null): DataConfidence {
  if (dataAgeMonths === null || dataAgeMonths < 1) return "INSUFFICIENT";
  if (dataAgeMonths < 3) return "LOW_CONFIDENCE";
  return "HIGH_CONFIDENCE";
}

// ============================================================================
// Main Scoring Function
// ============================================================================

/**
 * Calculate 7-dimension trust score.
 *
 * Public Assessment formula:
 *   composite = (identity × 0.55) + (technical × 0.15)
 *             + (policyScore × 0.15) + (webPresence × 0.15)
 *             + Brand Fast-Track bonus
 *
 * Verified Merchant formula:
 *   composite = (identity × 0.15) + (technical × 0.05) + (compliance × 0.10)
 *             + (policyScore × 0.05) + (webPresence × 0.05)
 *             + (dataQuality × 0.25) + (fulfillment × 0.35)
 *
 * Score cap: 94 (95+ reserved for manual review)
 *
 * @param evidence - Scoring evidence
 * @param weights - Optional weight override (auto-detects phase if omitted)
 * @param dataAgeMonths - Months of verified data (for confidence label only)
 * @returns ScoreResult with trustScore, badge, tier, dimensions, and confidence
 */
export function calculateTrustScore(
  evidence: ScoringEvidence,
  weights?: ScoringWeights,
  dataAgeMonths?: number | null,
): ScoreResult {
  // Auto-detect scoring phase if weights not explicitly provided
  const w = weights ?? (hasMerchantData(evidence) ? VERIFIED_MERCHANT_WEIGHTS : PUBLIC_ASSESSMENT_WEIGHTS);

  // 1. Calculate all 7 dimension scores (always computed, regardless of weight)
  const identity = scoreIdentity(evidence);
  const technical = scoreTechnical(evidence);
  const compliance = scoreCompliance(evidence);
  const policyScoreVal = scorePolicyScore(evidence);
  const webPresenceVal = scoreWebPresence(evidence);
  const dataQuality = scoreDataQuality(evidence);
  const fulfillment = scoreFulfillment(evidence);

  // 2. Weighted composite
  const rawComposite =
    identity * w.identity +
    technical * w.technical +
    compliance * w.compliance +
    policyScoreVal * w.policyScore +
    webPresenceVal * w.webPresence +
    dataQuality * w.dataQuality +
    fulfillment * w.fulfillment;

  // 3. Brand Fast-Track bonus
  const fastTrackBonus = calculateFastTrackBonus(evidence);

  // 4. Round and apply cap
  const trustScore = Math.min(
    Math.round(rawComposite + fastTrackBonus),
    TRUST_SCORE_AUTO_CAP,
  );

  // 5. Assign badge and tier
  const badge = assignBadge(trustScore);
  const tier = assignTier(badge);

  // 6. Assemble dimensions record
  const dimensions: TrustDimensions = {
    identity,
    technical,
    compliance,
    policyScore: policyScoreVal,
    webPresence: webPresenceVal,
    dataQuality,
    fulfillment,
  };

  // 7. Build verification data
  const verificationData = buildVerificationData(evidence, dimensions);

  // 8. Data confidence label (does NOT affect score)
  const dataConfidence = determineDataConfidence(dataAgeMonths ?? null);

  return { trustScore, badge, tier, dimensions, verificationData, dataConfidence };
}

// ============================================================================
// Verification Data Builder
// ============================================================================

/** Build verification data for API response */
function buildVerificationData(
  evidence: ScoringEvidence,
  dimensions: TrustDimensions,
): VerificationData {
  const tiers: VerificationData["tiers"] = {
    identity: {
      status: dimensions.identity > 0 ? "VERIFIED" : "PENDING",
      evidence: buildIdentityEvidence(evidence),
      source: resolveIdentitySource(evidence),
    },
    compliance: {
      status: evidence.complianceScore > 0 || evidence.complianceStatus === "VERIFIED" || evidence.complianceStatus === "PARTIAL"
        ? evidence.complianceStatus
        : isHighComplianceIndustry(evidence.category) ? "INFERRED" : "PENDING",
      evidence: evidence.complianceEvidence || (isHighComplianceIndustry(evidence.category) ? "Industry has regulatory compliance obligations (inferred)" : "Awaiting compliance review"),
      source: evidence.complianceScore > 0 ? "compliance-audit" : "",
    },
    dataQuality: {
      status: dimensions.dataQuality > 0 ? "PARTIAL" : "PENDING",
      evidence: dimensions.dataQuality > 0 ? "Product data partially available" : "Requires merchant API integration",
      source: dimensions.dataQuality > 0 ? "merchant-api" : "",
    },
    fulfillment: {
      status: dimensions.fulfillment > 0 ? "PARTIAL" : "PENDING",
      evidence: dimensions.fulfillment > 0 ? "Fulfillment data partially available" : "Requires merchant API integration",
      source: dimensions.fulfillment > 0 ? "merchant-api" : "",
    },
  };

  return { tiers };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/** Clamp a value to [min, max] range */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Check if exchange is US-regulated (SEC jurisdiction) */
function isUsExchange(exchange: string | null): boolean {
  if (!exchange) return false;
  return (US_EXCHANGES as readonly string[]).includes(exchange.toUpperCase());
}

/** Check if category is a high-compliance industry */
function isHighComplianceIndustry(category: string | null): boolean {
  if (!category) return false;
  return (HIGH_COMPLIANCE_INDUSTRIES as readonly string[]).includes(category)
    || (MID_COMPLIANCE_INDUSTRIES as readonly string[]).includes(category);
}

/** Build identity evidence description */
function buildIdentityEvidence(evidence: ScoringEvidence): string {
  const parts: string[] = [];
  if (evidence.hasSecFiling || evidence.hasStockSymbol) {
    parts.push(`Stock: ${evidence.stockExchange ?? "Exchange"}`);
  }
  if (evidence.hasWikidataId) parts.push("Wikidata verified");
  if (evidence.hasCorporateRegistry) parts.push("Corporate registry verified");
  if (evidence.hasWhoisData) parts.push("WHOIS consistent");
  if (evidence.hasParentCompany) parts.push("Parent company on record");
  return parts.length > 0 ? parts.join(", ") : "No identity evidence";
}

/** Resolve primary identity data source */
function resolveIdentitySource(evidence: ScoringEvidence): string {
  if (evidence.hasSecFiling) return "sec.gov";
  if (evidence.hasStockSymbol) return "stock-exchange";
  if (evidence.hasWikidataId) return "wikidata.org";
  if (evidence.hasCorporateRegistry) return "corporate-registry";
  if (evidence.hasWhoisData) return "whois";
  return "";
}
