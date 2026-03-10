/**
 * ============================================================================
 * OTR Protocol v3 — Scoring Constants
 * ============================================================================
 *
 * All weights, thresholds, and configuration for deterministic trust scoring.
 *
 * v3 Changes:
 * - Public Assessment: Identity weight increased to 0.55 (anti-gaming)
 * - Verified Merchant: Fulfillment weight increased to 0.35 (behavior-driven)
 * - No time-based scoring factors (fairness principle)
 * - Anti-gaming detection configuration added
 *
 * @version 3.0.0
 */

import type { ScoringWeights } from "./types";

// ============================================================================
// Scoring Weights
// ============================================================================

/**
 * Public Assessment weights (formerly "Cold Start")
 *
 * Identity dominates (0.55) because it contains unforgeable signals
 * (stock exchange listings, Wikidata, Tranco rank, domain age).
 * Technical/Policy/Web are easily gameable and weighted lower.
 *
 * Effect: A gaming site with id=10, tech=100, pol=100, web=100
 *         scores 50.5 (UNRATED) instead of old 68.5 (BRONZE).
 */
export const PUBLIC_ASSESSMENT_WEIGHTS: ScoringWeights = {
  identity: 0.55,
  technical: 0.15,
  compliance: 0.00,
  policyScore: 0.15,
  webPresence: 0.15,
  dataQuality: 0.00,
  fulfillment: 0.00,
};

/**
 * Verified Merchant weights (formerly "Merchant Authorized")
 *
 * Fulfillment (0.35) and DataQuality (0.25) dominate because
 * "will they actually ship?" is an AI agent's top concern.
 * Identity drops to 0.15 — big brands already proved themselves.
 *
 * Score is purely behavior-driven, NOT linked to integration time.
 * A merchant with 1 month of excellent data scores the same as
 * one with 12 months of the same data quality.
 */
export const VERIFIED_MERCHANT_WEIGHTS: ScoringWeights = {
  identity: 0.15,
  technical: 0.05,
  compliance: 0.10,
  policyScore: 0.05,
  webPresence: 0.05,
  dataQuality: 0.25,
  fulfillment: 0.35,
};

// ============================================================================
// Badge & Score Thresholds
// ============================================================================

/** Badge assignment thresholds */
export const BADGE_THRESHOLDS = {
  PLATINUM: 90,
  GOLD: 80,
  SILVER: 70,
  BRONZE: 60,
} as const;

/** Maximum auto-assigned score (95+ reserved for manual review) */
export const TRUST_SCORE_AUTO_CAP = 94;

// ============================================================================
// Brand Fast-Track
// ============================================================================

/**
 * Brand Fast-Track bonus configuration.
 *
 * Major brands with independently verifiable signals get bonus points:
 * - Stock exchange listed + Tranco top 1K + Wikidata → +15
 * - Stock exchange listed + Tranco top 1K (no Wikidata) → +10
 * - Stock exchange listed only → +10
 * - Tranco top 1K only → +8
 *
 * Wikidata required for highest tier as cross-validation signal.
 */
export const BRAND_FAST_TRACK = {
  enabled: true,
  listedAndTop1KAndWikidata: 15,
  listedAndTop1KNoWikidata: 10,
  listedOnly: 10,
  top1KOnly: 8,
  respectAutoCap: true,
} as const;

// ============================================================================
// Tranco Rank Tiers (Identity dimension)
// ============================================================================

/** Tranco rank scoring tiers — higher rank = higher trust signal */
export const TRANCO_TIERS = [
  { maxRank: 1_000, points: 15 },
  { maxRank: 5_000, points: 12 },
  { maxRank: 10_000, points: 10 },
  { maxRank: 50_000, points: 7 },
  { maxRank: 100_000, points: 5 },
  { maxRank: 500_000, points: 3 },
  { maxRank: 1_000_000, points: 2 },
] as const;

// ============================================================================
// US Exchanges (SEC-regulated)
// ============================================================================

/** Stock exchanges under SEC regulation */
export const US_EXCHANGES = [
  "NYSE",
  "NASDAQ",
  "NYSEARCA",
  "NYSE ARCA",
  "NYSE American",
] as const;

// ============================================================================
// Anti-Gaming Detection Configuration
// ============================================================================

/**
 * Anti-gaming detection thresholds.
 *
 * Prevents adversarial optimization of easily gameable signals
 * (technical security, policy pages, web presence).
 *
 * Detection patterns:
 * 1. Time clustering: All tech signals appear within 30 days + domain < 1 year
 * 2. Signal-brand mismatch: Perfect tech scores + no Tranco/Wikidata + young domain
 * 3. Template detection: Privacy policy matches known template fingerprints
 * 4. Domain age gate: Young domains have capped scores on gameable dimensions
 */
export const ANTI_GAMING_CONFIG = {
  enabled: true,
  /** Domain age thresholds for gameable dimension caps */
  domainAgeGates: {
    /** Domain < 6 months: gameable dimensions capped at 50 */
    sixMonthsCap: 50,
    /** Domain < 1 year: gameable dimensions capped at 75 */
    oneYearCap: 75,
  },
  /** Multipliers for detected gaming patterns */
  multipliers: {
    /** Time clustering detected */
    timeClustering: 0.7,
    /** Signal-brand mismatch detected */
    signalBrandMismatch: 0.5,
    /** Template policy detected */
    templatePolicy: 0.5,
  },
  /** Threshold for "perfect tech but no identity" detection */
  techScoreThreshold: 80,
  /** Minimum Tranco rank to be considered "established" */
  trancoEstablishedThreshold: 100_000,
} as const;

// ============================================================================
// Score Decay Configuration
// ============================================================================

/**
 * Score decay intervals.
 *
 * Scores decay over time if merchant data is not refreshed.
 * This ensures stale data doesn't maintain artificially high scores.
 */
export const SCORE_DECAY_CONFIG = {
  enabled: true,
  intervals: [
    { maxDays: 7, factor: 1.0 },
    { maxDays: 30, factor: 0.95 },
    { maxDays: 90, factor: 0.85 },
    { maxDays: Infinity, factor: 0.65 },
  ],
} as const;

// ============================================================================
// Data Confidence Configuration
// ============================================================================

/**
 * Data confidence thresholds.
 *
 * DataConfidence is a display-only label that does NOT affect scoring.
 * It tells AI agents how much data backs the score.
 */
export const DATA_CONFIDENCE_CONFIG = {
  /** Months of data for HIGH_CONFIDENCE */
  highConfidenceMonths: 3,
  /** Months of data for LOW_CONFIDENCE */
  lowConfidenceMonths: 1,
} as const;

// ============================================================================
// High Compliance Industries
// ============================================================================

/** Industries with regulatory compliance obligations */
export const HIGH_COMPLIANCE_INDUSTRIES = [
  "Financial Services",
  "Banking",
  "Insurance",
  "Healthcare",
  "Pharmaceuticals",
] as const;

/** Industries with moderate compliance expectations */
export const MID_COMPLIANCE_INDUSTRIES = [
  "Food & Beverage",
  "Telecommunications",
  "Education",
  "Government",
  "Energy",
] as const;
