/**
 * ============================================================================
 * @otr-protocol/sdk — TypeScript Client for OTR Protocol
 * ============================================================================
 *
 * Lightweight SDK for querying the OTR merchant trust registry.
 *
 * @example
 * ```typescript
 * import { OtrClient } from "@otr-protocol/sdk";
 *
 * const otr = new OtrClient();
 *
 * // Verify a merchant
 * const result = await otr.verify("nike.com");
 * console.log(result.trustScore);  // 88
 * console.log(result.badge);       // "GOLD"
 *
 * // Search the registry
 * const merchants = await otr.search({ category: "Electronics", minScore: 70 });
 * ```
 *
 * @version 3.0.0
 */

// ============================================================================
// Types
// ============================================================================

/** OTR trust verification result */
export interface OtrVerifyResult {
  /** Merchant domain */
  domain: string;
  /** Brand name (if known) */
  brandName: string | null;
  /** Composite trust score (0-94) */
  trustScore: number;
  /** Trust badge level */
  badge: "PLATINUM" | "GOLD" | "SILVER" | "BRONZE" | "UNRATED";
  /** Trust tier */
  tier: string;
  /** 7-dimension scores */
  trustDimensions: {
    identity: number;
    technical: number;
    compliance: number;
    policyScore: number;
    webPresence: number;
    dataQuality: number;
    fulfillment: number;
  };
  /** Verification evidence */
  verificationData: Record<string, unknown>;
  /** Business category */
  category: string | null;
  /** Last update timestamp */
  updatedAt: string;
}

/** Search query parameters */
export interface OtrSearchQuery {
  /** Text search (merchant name or domain) */
  query?: string;
  /** Filter by category */
  category?: string;
  /** Minimum trust score */
  minScore?: number;
  /** Filter by badge level */
  badge?: "PLATINUM" | "GOLD" | "SILVER" | "BRONZE";
  /** Maximum results (default: 10, max: 50) */
  limit?: number;
}

/** Search result */
export interface OtrSearchResult {
  /** Total matching merchants */
  total: number;
  /** Merchant entries */
  merchants: OtrVerifyResult[];
}

/** SDK configuration */
export interface OtrClientConfig {
  /** API base URL (default: https://api.orbexa.io) */
  baseUrl?: string;
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
  /** Custom fetch function (for testing or Node.js polyfills) */
  fetchFn?: typeof fetch;
}

/** API error */
export class OtrApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly domain?: string,
  ) {
    super(message);
    this.name = "OtrApiError";
  }
}

// ============================================================================
// Client
// ============================================================================

/** OTR Protocol TypeScript client */
export class OtrClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly fetchFn: typeof fetch;

  constructor(config?: OtrClientConfig) {
    this.baseUrl = (config?.baseUrl ?? "https://api.orbexa.io").replace(/\/$/, "");
    this.timeout = config?.timeout ?? 10_000;
    this.fetchFn = config?.fetchFn ?? globalThis.fetch;
  }

  /**
   * Verify a merchant's trust score.
   *
   * @param domain - Merchant domain (e.g., "nike.com")
   * @returns Trust verification result
   * @throws OtrApiError if domain not found or API error
   */
  async verify(domain: string): Promise<OtrVerifyResult> {
    const cleanDomain = normalizeDomain(domain);
    const response = await this.request(`/api/otr/verify/${encodeURIComponent(cleanDomain)}`);

    if (response.status === 404) {
      throw new OtrApiError(`Domain "${cleanDomain}" not found in OTR registry`, 404, cleanDomain);
    }

    if (!response.ok) {
      throw new OtrApiError(`OTR API error: ${response.status}`, response.status, cleanDomain);
    }

    return (await response.json()) as OtrVerifyResult;
  }

  /**
   * Check if a merchant exists in the registry.
   *
   * @param domain - Merchant domain
   * @returns true if found, false if not
   */
  async exists(domain: string): Promise<boolean> {
    try {
      await this.verify(domain);
      return true;
    } catch (error: unknown) {
      if (error instanceof OtrApiError && error.status === 404) return false;
      throw error;
    }
  }

  /**
   * Search the OTR merchant registry.
   *
   * @param query - Search parameters
   * @returns Search results
   */
  async search(query?: OtrSearchQuery): Promise<OtrSearchResult> {
    const params = new URLSearchParams();
    if (query?.query) params.set("q", query.query);
    if (query?.category) params.set("category", query.category);
    if (query?.badge) params.set("badge", query.badge);
    if (query?.minScore !== undefined) params.set("minScore", String(query.minScore));
    params.set("limit", String(Math.min(query?.limit ?? 10, 50)));

    const response = await this.request(`/api/otr/registry?${params.toString()}`);

    if (!response.ok) {
      throw new OtrApiError(`OTR API error: ${response.status}`, response.status);
    }

    return (await response.json()) as OtrSearchResult;
  }

  /**
   * Get registry statistics.
   *
   * @returns Registry stats (total merchants, badge distribution, etc.)
   */
  async stats(): Promise<Record<string, unknown>> {
    const response = await this.request("/api/otr/stats");

    if (!response.ok) {
      throw new OtrApiError(`OTR API error: ${response.status}`, response.status);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  // ── Internal ──

  private async request(path: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      return await this.fetchFn(`${this.baseUrl}${path}`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "@otr-protocol/sdk/3.0.0",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

/** Normalize domain input */
function normalizeDomain(input: string): string {
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "");
  domain = domain.replace(/^www\./, "");
  domain = domain.replace(/\/.*$/, "");
  return domain;
}

// ── Re-export core types for convenience ──
// Note: When using the SDK standalone, install @otr-protocol/core separately
// for type definitions. These types are duplicated here for SDK independence.
export type Badge = "PLATINUM" | "GOLD" | "SILVER" | "BRONZE" | "UNRATED";
export type Tier = "TIER_5" | "TIER_4" | "TIER_3" | "TIER_2" | "TIER_1";
