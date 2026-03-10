/**
 * ============================================================================
 * OTR Protocol v3 — Conformance Test Runner
 * ============================================================================
 *
 * Validates that a scoring implementation produces identical outputs
 * for the standard test vectors. Any compliant OTR implementation
 * MUST pass all conformance tests.
 *
 * Usage:
 *   npx tsx conformance/runner.ts
 *
 * @version 3.0.0
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateTrustScore,
  hasMerchantData,
  calculateFastTrackBonus,
} from "../packages/core/src/index";
import type { ScoringEvidence, Badge, Tier, TrustDimensions } from "../packages/core/src/index";

// ============================================================================
// Types
// ============================================================================

interface TestVector {
  id: string;
  description: string;
  evidence: ScoringEvidence;
  expectedPhase: "PUBLIC_ASSESSMENT" | "VERIFIED_MERCHANT";
  expectedDimensions: TrustDimensions & { _comment?: string };
  expectedFastTrackBonus: number;
  expectedTrustScore: number;
  expectedBadge: Badge;
  expectedTier: Tier;
}

interface TestVectorsFile {
  version: string;
  description: string;
  vectors: TestVector[];
}

interface TestResult {
  id: string;
  passed: boolean;
  errors: string[];
}

// ============================================================================
// Runner
// ============================================================================

function main(): void {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const vectorsPath = resolve(currentDir, "test-vectors.json");
  const raw = readFileSync(vectorsPath, "utf-8");
  const data = JSON.parse(raw) as TestVectorsFile;

  console.log(`\nOTR Protocol Conformance Test Runner v${data.version}`);
  console.log(`${"=".repeat(60)}\n`);
  console.log(`Running ${data.vectors.length} test vectors...\n`);

  const results: TestResult[] = [];

  for (const vector of data.vectors) {
    const result = runVector(vector);
    results.push(result);

    const status = result.passed ? "PASS" : "FAIL";
    const icon = result.passed ? "\u2713" : "\u2717";
    console.log(`  ${icon} [${status}] ${vector.id}: ${vector.description}`);
    if (!result.passed) {
      for (const err of result.errors) {
        console.log(`      - ${err}`);
      }
    }
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} total`);

  if (failed > 0) {
    console.log("\nCONFORMANCE CHECK FAILED");
    process.exit(1);
  }

  console.log("\nAll conformance tests passed!");
  process.exit(0);
}

function runVector(vector: TestVector): TestResult {
  const errors: string[] = [];

  // 1. Check phase detection
  const isMerchant = hasMerchantData(vector.evidence);
  const actualPhase = isMerchant ? "VERIFIED_MERCHANT" : "PUBLIC_ASSESSMENT";
  if (actualPhase !== vector.expectedPhase) {
    errors.push(`Phase: expected ${vector.expectedPhase}, got ${actualPhase}`);
  }

  // 2. Check fast-track bonus
  const actualBonus = calculateFastTrackBonus(vector.evidence);
  if (actualBonus !== vector.expectedFastTrackBonus) {
    errors.push(`FastTrackBonus: expected ${vector.expectedFastTrackBonus}, got ${actualBonus}`);
  }

  // 3. Calculate trust score
  const result = calculateTrustScore(vector.evidence);

  // 4. Check dimension scores
  const dimNames = ["identity", "technical", "compliance", "policyScore", "webPresence", "dataQuality", "fulfillment"] as const;
  for (const dim of dimNames) {
    const expected = vector.expectedDimensions[dim];
    const actual = result.dimensions[dim];
    if (actual !== expected) {
      errors.push(`dimensions.${dim}: expected ${expected}, got ${actual}`);
    }
  }

  // 5. Check composite score
  if (result.trustScore !== vector.expectedTrustScore) {
    errors.push(`trustScore: expected ${vector.expectedTrustScore}, got ${result.trustScore}`);
  }

  // 6. Check badge
  if (result.badge !== vector.expectedBadge) {
    errors.push(`badge: expected ${vector.expectedBadge}, got ${result.badge}`);
  }

  // 7. Check tier
  if (result.tier !== vector.expectedTier) {
    errors.push(`tier: expected ${vector.expectedTier}, got ${result.tier}`);
  }

  return { id: vector.id, passed: errors.length === 0, errors };
}

main();
