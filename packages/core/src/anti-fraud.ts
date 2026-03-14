/**
 * ============================================================================
 * OTR Protocol v4 — Anti-Gaming Detection
 * ============================================================================
 *
 * Detects adversarial optimization of gameable scoring signals.
 * Prevents fraudulent sites from inflating trust scores by
 * optimizing technical/policy/web signals while lacking real identity.
 *
 * Detection Patterns:
 * 1. Signal-Brand Mismatch: Perfect tech + no identity = suspicious
 * 2. Identity-Gameable Gap: Low identity with high gameable = suspicious
 * 3. Domain Age Gate: Young domains have capped gameable dimension scores
 * 4. Template Detection: Policy pages matching known template fingerprints
 * 5. Template Site Suspect: Young domain with no Tranco/Wikidata and moderate gameable scores
 *
 * @version 4.0.0
 */

import type {
  ScoringEvidence,
  TrustDimensions,
  AntiGamingResult,
  AntiGamingSeverity,
} from "./types";

import { ANTI_GAMING_CONFIG } from "./constants";

// ============================================================================
// Anti-Gaming Detection
// ============================================================================

/**
 * Run anti-gaming detection on scoring evidence.
 *
 * Returns a multiplier (0.0-1.0) to apply to gameable dimensions
 * (technical, policyScore, webPresence).
 *
 * @param evidence - Scoring evidence
 * @param dimensions - Pre-computed dimension scores
 * @returns AntiGamingResult with severity, multiplier, and detected patterns
 */
export function detectGaming(
  evidence: ScoringEvidence,
  dimensions: TrustDimensions,
): AntiGamingResult {
  if (!ANTI_GAMING_CONFIG.enabled) {
    return { severity: "CLEAN", multiplier: 1.0, patterns: [] };
  }

  const patterns: string[] = [];
  let worstMultiplier = 1.0;

  // Pre-compute gameable average for multiple patterns
  const gameableAvg = (dimensions.technical + dimensions.policyScore + dimensions.webPresence) / 3;

  // Pattern 1: Signal-Brand Mismatch
  // High tech score + no Tranco/Wikidata/stock + young domain = LIKELY_GAMING
  const hasEstablishedIdentity =
    evidence.hasWikidataId ||
    evidence.hasStockSymbol ||
    (evidence.trancoRank !== null && evidence.trancoRank <= ANTI_GAMING_CONFIG.trancoEstablishedThreshold);

  if (dimensions.technical >= ANTI_GAMING_CONFIG.techScoreThreshold && !hasEstablishedIdentity) {
    const isYoungDomain = evidence.companyAge !== null && evidence.companyAge < 2;
    if (isYoungDomain || evidence.companyAge === null) {
      patterns.push("SIGNAL_BRAND_MISMATCH: High technical score with no verifiable brand identity");
      worstMultiplier = Math.min(worstMultiplier, ANTI_GAMING_CONFIG.multipliers.signalBrandMismatch);
    }
  }

  // Pattern: Identity-Gameable Gap
  // Low identity but high gameable dimensions + no established identity
  if (
    dimensions.identity < 20 &&
    gameableAvg > 70 &&
    !hasEstablishedIdentity
  ) {
    patterns.push("IDENTITY_GAMEABLE_GAP: Low identity score with high gameable dimensions");
    worstMultiplier = Math.min(worstMultiplier, ANTI_GAMING_CONFIG.multipliers.identityGameableGap);
  }

  // Pattern 2: Domain Age Gate
  // Young domains have capped gameable dimension scores
  if (evidence.companyAge !== null) {
    if (evidence.companyAge < 0.5) {
      patterns.push("DOMAIN_AGE_GATE: Domain under 6 months, gameable dimensions capped");
      const capMultiplier = ANTI_GAMING_CONFIG.domainAgeGates.sixMonthsCap / 100;
      worstMultiplier = Math.min(worstMultiplier, capMultiplier);
    } else if (evidence.companyAge < 1) {
      patterns.push("DOMAIN_AGE_GATE: Domain under 1 year, gameable dimensions capped");
      const capMultiplier = ANTI_GAMING_CONFIG.domainAgeGates.oneYearCap / 100;
      worstMultiplier = Math.min(worstMultiplier, capMultiplier);
    }
  }

  // Pattern 3: Perfect Gameable Scores
  // All gameable dimensions near-perfect + low identity = suspicious
  const gameablePerfect =
    dimensions.technical >= 90 &&
    dimensions.policyScore >= 90 &&
    dimensions.webPresence >= 90;

  if (gameablePerfect && dimensions.identity < 30) {
    patterns.push("PERFECT_GAMEABLE: Near-perfect tech/policy/web with minimal identity");
    worstMultiplier = Math.min(worstMultiplier, ANTI_GAMING_CONFIG.multipliers.timeClustering);
  }

  // Pattern: Template Site Suspect
  // Young domain + no Tranco + no Wikidata + no SEC + gameable avg > 60
  if (
    (evidence.companyAge !== null && evidence.companyAge < 1) || evidence.companyAge === null
  ) {
    if (
      !evidence.hasWikidataId &&
      !evidence.hasStockSymbol &&
      (evidence.trancoRank === null || evidence.trancoRank > ANTI_GAMING_CONFIG.trancoEstablishedThreshold) &&
      gameableAvg > 60
    ) {
      patterns.push("TEMPLATE_SITE_SUSPECT: Young/unknown domain with no identity signals and high gameable scores");
      worstMultiplier = Math.min(worstMultiplier, ANTI_GAMING_CONFIG.multipliers.templatePolicy);
    }
  }

  // Determine severity
  let severity: AntiGamingSeverity = "CLEAN";
  if (worstMultiplier <= 0.5) {
    severity = "LIKELY_GAMING";
  } else if (worstMultiplier < 1.0) {
    severity = "SUSPICIOUS";
  }

  return { severity, multiplier: worstMultiplier, patterns };
}

/**
 * Apply anti-gaming multiplier to dimension scores.
 *
 * Only affects gameable dimensions: technical, policyScore, webPresence.
 * Identity, compliance, dataQuality, fulfillment are NOT affected.
 *
 * @param dimensions - Original dimension scores
 * @param multiplier - Anti-gaming multiplier (0.0-1.0)
 * @returns Adjusted dimension scores
 */
export function applyAntiGamingMultiplier(
  dimensions: TrustDimensions,
  multiplier: number,
): TrustDimensions {
  if (multiplier >= 1.0) return dimensions;

  return {
    ...dimensions,
    technical: Math.round(dimensions.technical * multiplier),
    policyScore: Math.round(dimensions.policyScore * multiplier),
    webPresence: Math.round(dimensions.webPresence * multiplier),
  };
}
