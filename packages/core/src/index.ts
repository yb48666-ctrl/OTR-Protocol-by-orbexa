/**
 * ============================================================================
 * @otr-protocol/core — Deterministic Trust Scoring Engine
 * ============================================================================
 *
 * Open Trust Registry (OTR) Protocol v3
 * Merchant trust verification for AI agent commerce.
 *
 * @example
 * ```typescript
 * import { calculateTrustScore } from "@otr-protocol/core";
 *
 * const result = calculateTrustScore({
 *   // Identity signals
 *   hasSecFiling: true,
 *   hasStockSymbol: true,
 *   stockExchange: "NYSE",
 *   hasWikidataId: true,
 *   // ... other evidence
 * });
 *
 * console.log(result.trustScore); // 85
 * console.log(result.badge);      // "GOLD"
 * console.log(result.tier);       // "TIER_4"
 * ```
 *
 * @version 3.0.0
 * @license MIT
 */

// ── Types ──
export type {
  ScoringEvidence,
  TrustDimensions,
  ScoringWeights,
  ScoreResult,
  Badge,
  Tier,
  DataConfidence,
  TierStatus,
  AntiGamingSeverity,
  AntiGamingResult,
  TierDetail,
  VerificationData,
  TrustManifest,
  SignedTrustManifest,
} from "./types";

export {
  BADGE_LEVELS,
  TIER_LEVELS,
  DATA_CONFIDENCE_LEVELS,
  TIER_STATUSES,
  ANTI_GAMING_SEVERITY,
} from "./types";

// ── Constants ──
export {
  PUBLIC_ASSESSMENT_WEIGHTS,
  VERIFIED_MERCHANT_WEIGHTS,
  BADGE_THRESHOLDS,
  TRUST_SCORE_AUTO_CAP,
  BRAND_FAST_TRACK,
  TRANCO_TIERS,
  US_EXCHANGES,
  ANTI_GAMING_CONFIG,
  SCORE_DECAY_CONFIG,
  DATA_CONFIDENCE_CONFIG,
  HIGH_COMPLIANCE_INDUSTRIES,
  MID_COMPLIANCE_INDUSTRIES,
} from "./constants";

// ── Scoring Engine ──
export {
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
} from "./scorer";

// ── Anti-Gaming Detection ──
export {
  detectGaming,
  applyAntiGamingMultiplier,
} from "./anti-fraud";

// ── Trust Manifest Validator ──
export {
  validateManifest,
  verifySignedManifest,
  signManifest,
} from "./validator";

export type {
  ValidationResult,
  VerificationResult,
} from "./validator";
