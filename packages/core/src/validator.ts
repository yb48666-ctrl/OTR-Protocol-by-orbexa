/**
 * ============================================================================
 * OTR Protocol v3 — Trust Manifest Validator
 * ============================================================================
 *
 * Validates and verifies OTR trust.json manifests.
 * Supports ECDSA P-256 signature verification for signed manifests.
 *
 * Trust manifests are published by merchants at:
 *   /.well-known/otr/trust.json
 *
 * @version 3.0.0
 */

import type {
  TrustManifest,
  SignedTrustManifest,
  Badge,
} from "./types";

import { BADGE_THRESHOLDS, TRUST_SCORE_AUTO_CAP } from "./constants";

/** JWK key format (compatible with Web Crypto API) */
interface JwkKey {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  d?: string;
  [key: string]: unknown;
}

// ============================================================================
// Validation Result Types
// ============================================================================

/** Result of manifest validation */
export interface ValidationResult {
  /** Whether the manifest is valid */
  valid: boolean;
  /** Validation errors (empty if valid) */
  errors: string[];
  /** Validation warnings (non-blocking) */
  warnings: string[];
}

/** Result of signature verification */
export interface VerificationResult {
  /** Whether the signature is valid */
  verified: boolean;
  /** The manifest payload (if verified) */
  manifest: TrustManifest | null;
  /** Error message (if verification failed) */
  error: string | null;
}

// ============================================================================
// Manifest Validation
// ============================================================================

/**
 * Validate a trust manifest for structural correctness.
 *
 * Checks:
 * - Required fields present
 * - Score within valid range (0-94)
 * - Badge matches score
 * - Dimensions are valid numbers (0-100)
 * - Timestamps are valid ISO 8601
 * - Manifest not expired
 */
export function validateManifest(manifest: TrustManifest): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!manifest.version) errors.push("Missing required field: version");
  if (!manifest.domain) errors.push("Missing required field: domain");
  if (!manifest.issuer) errors.push("Missing required field: issuer");
  if (!manifest.issuedAt) errors.push("Missing required field: issuedAt");
  if (!manifest.expiresAt) errors.push("Missing required field: expiresAt");

  // Score range
  if (typeof manifest.trustScore !== "number") {
    errors.push("trustScore must be a number");
  } else {
    if (manifest.trustScore < 0) errors.push("trustScore cannot be negative");
    if (manifest.trustScore > TRUST_SCORE_AUTO_CAP) {
      warnings.push(`trustScore ${manifest.trustScore} exceeds auto-cap ${TRUST_SCORE_AUTO_CAP}`);
    }
  }

  // Badge consistency
  if (manifest.badge && typeof manifest.trustScore === "number") {
    const expectedBadge = scoreToExpectedBadge(manifest.trustScore);
    if (manifest.badge !== expectedBadge) {
      errors.push(`Badge "${manifest.badge}" inconsistent with score ${manifest.trustScore} (expected "${expectedBadge}")`);
    }
  }

  // Dimension scores
  if (manifest.dimensions) {
    const dimNames = ["identity", "technical", "compliance", "policyScore", "webPresence", "dataQuality", "fulfillment"] as const;
    for (const dim of dimNames) {
      const val = manifest.dimensions[dim];
      if (typeof val !== "number") {
        errors.push(`dimensions.${dim} must be a number`);
      } else if (val < 0 || val > 100) {
        errors.push(`dimensions.${dim} must be 0-100, got ${val}`);
      }
    }
  } else {
    errors.push("Missing required field: dimensions");
  }

  // Timestamp validity
  if (manifest.issuedAt) {
    const issued = Date.parse(manifest.issuedAt);
    if (isNaN(issued)) errors.push("issuedAt is not a valid ISO 8601 timestamp");
  }
  if (manifest.expiresAt) {
    const expires = Date.parse(manifest.expiresAt);
    if (isNaN(expires)) {
      errors.push("expiresAt is not a valid ISO 8601 timestamp");
    } else if (expires < Date.now()) {
      warnings.push("Manifest has expired");
    }
  }

  // Version check
  if (manifest.version && !manifest.version.startsWith("3.")) {
    warnings.push(`Manifest version ${manifest.version} may not be compatible with v3 validator`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Verify a signed trust manifest.
 *
 * Uses Web Crypto API (ECDSA P-256) to verify the signature.
 * Available in Node.js 15+ and all modern browsers.
 *
 * @param signed - The signed manifest
 * @param publicKeyJwk - The issuer's public key in JWK format
 * @returns VerificationResult
 */
export async function verifySignedManifest(
  signed: SignedTrustManifest,
  publicKeyJwk: JwkKey,
): Promise<VerificationResult> {
  try {
    // Import the public key
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      publicKeyJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );

    // Encode the manifest payload
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(signed.manifest));

    // Decode the base64url signature
    const signature = base64urlToBuffer(signed.signature);

    // Verify
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signature,
      data,
    );

    if (!valid) {
      return { verified: false, manifest: null, error: "Signature verification failed" };
    }

    return { verified: true, manifest: signed.manifest, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown verification error";
    return { verified: false, manifest: null, error: message };
  }
}

/**
 * Sign a trust manifest with ECDSA P-256.
 *
 * @param manifest - The manifest to sign
 * @param privateKeyJwk - The signer's private key in JWK format
 * @param keyId - Public key identifier
 * @returns SignedTrustManifest
 */
export async function signManifest(
  manifest: TrustManifest,
  privateKeyJwk: JwkKey,
  keyId: string,
): Promise<SignedTrustManifest> {
  // Import the private key
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  // Encode the manifest payload
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(manifest));

  // Sign
  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    data,
  );

  // Convert to base64url
  const signature = bufferToBase64url(signatureBuffer);

  return { manifest, signature, keyId };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/** Determine expected badge for a given score */
function scoreToExpectedBadge(score: number): Badge {
  if (score >= BADGE_THRESHOLDS.PLATINUM) return "PLATINUM";
  if (score >= BADGE_THRESHOLDS.GOLD) return "GOLD";
  if (score >= BADGE_THRESHOLDS.SILVER) return "SILVER";
  if (score >= BADGE_THRESHOLDS.BRONZE) return "BRONZE";
  return "UNRATED";
}

/** Convert base64url string to ArrayBuffer */
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Convert ArrayBuffer to base64url string */
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
