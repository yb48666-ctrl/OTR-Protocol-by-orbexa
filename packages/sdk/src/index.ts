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
 * console.log(result.trustScore);  // 80
 * console.log(result.badge);       // "GOLD"
 *
 * // Search the registry
 * const results = await otr.search({ category: "Electronics", minScore: 70 });
 * ```
 *
 * @version 3.1.0
 */

// ============================================================================
// Types — match actual OTR API response structure
// ============================================================================

/** Trust badge level */
export type Badge = "PLATINUM" | "GOLD" | "SILVER" | "BRONZE" | "UNRATED";

/** Trust tier level */
export type Tier = "TIER_5" | "TIER_4" | "TIER_3" | "TIER_2" | "TIER_1";

/** Verification tier detail for a single dimension */
export interface TierDetail {
  /** Data source identifier */
  source: string;
  /** Verification status */
  status: string;
  /** Evidence description */
  evidence: string;
}

/** Merchant e-commerce capabilities (non-scoring output layer) */
export interface MerchantCapabilities {
  canPurchase: boolean;
  ecommercePlatform: string | null;
  ecommerceConfidence: number;
  paymentMethods: string[];
  hasLiveSupport: boolean;
  supportChannels: string[];
  socialPresence: string[];
  hasPhysicalAddress: boolean;
  hasBusinessEmail: boolean;
}

/** Discovered merchant links */
export interface MerchantLinks {
  policies: {
    privacy: string | null;
    refund: string | null;
    terms: string | null;
    cookie: string | null;
    shipping: string | null;
  };
  commerce: {
    cart: string | null;
    checkout: string | null;
    products: string | null;
    search: string | null;
  };
  contact: {
    email: string | null;
    phone: string | null;
    supportPage: string | null;
  };
  social: Record<string, string>;
}

/** Data freshness metadata */
export interface FreshnessInfo {
  lastVerifiedAt: string | null;
  dataAge: "FRESH" | "AGING" | "STALE";
  scanVersion: number | null;
  signalSources: string[];
}

/** Verification data containing all dimension evidence */
export interface VerificationData {
  tiers: {
    identity: TierDetail;
    technical: TierDetail;
    compliance: TierDetail;
    dataQuality: TierDetail;
    fulfillment: TierDetail;
    policyScore: TierDetail;
    webPresence: TierDetail;
  };
  /** v3.1: Merchant e-commerce capabilities */
  capabilities?: MerchantCapabilities;
  /** v3.1: Discovered site links */
  links?: MerchantLinks;
  /** v3.1: Data freshness info */
  freshness?: FreshnessInfo;
  /** v3.1: Policy page URLs */
  policyUrls?: Record<string, string>;
  scanMetadata?: {
    scanner: string;
    lastScanAt: string;
    scanVersion: number;
  };
  schema_version: string;
}

/** 7-dimension trust scores */
export interface TrustDimensions {
  identity: number;
  technical: number;
  compliance: number;
  policyScore: number;
  webPresence: number;
  dataQuality: number;
  fulfillment: number;
}

/** Data source provenance */
export interface DataSource {
  name: string;
  url: string;
  lastChecked: string;
}

/** OTR trust verification result — matches actual API response */
export interface OtrVerifyResult {
  /** Merchant domain */
  domain: string;
  /** Brand name */
  name: string;
  /** Composite trust score (0-94) */
  trustScore: number;
  /** Trust tier (TIER_1 to TIER_5) */
  trustTier: string;
  /** Trust badge level */
  badge: Badge;
  /** Business category */
  category: string | null;
  /** Verification evidence for all 7 dimensions */
  verificationData: VerificationData;
  /** 7-dimension scores */
  trustDimensions: TrustDimensions;
  /** Entity data (stock info, headquarters, etc.) */
  entityData: Record<string, unknown> | null;
  /** Data sources used for verification */
  dataSources: DataSource[];
  /** Tranco popularity rank (lower = more popular) */
  trancoRank: number | null;
  /** Whether merchant has integrated via ORBEXA API */
  isMerchantAuthorized: boolean;
  /** ORBEXA store URL (if merchant is authorized) */
  orbexaStoreUrl: string | null;
  /** Audit version number */
  auditVersion: number;
  /** Last verification timestamp (ISO 8601) */
  lastVerified: string;
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
  badge?: Badge;
  /** Maximum results (default: 10, max: 50) */
  limit?: number;
  /** Page number (default: 1) */
  page?: number;
}

/** Search result — matches actual API response */
export interface OtrSearchResult {
  /** Merchant entries */
  entries: OtrVerifyResult[];
  /** Total matching merchants */
  total: number;
  /** Current page */
  page: number;
  /** Results per page */
  limit: number;
  /** Total pages available */
  totalPages: number;
}

/** Registry statistics */
export interface OtrStats {
  totalEntries: number;
  verifiedCount: number;
  platinumCount: number;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  unratedCount: number;
}

/** SDK configuration */
export interface OtrClientConfig {
  /** API base URL (default: https://orbexa.io) */
  baseUrl?: string;
  /** Request timeout in ms (default: 15000) */
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
    this.baseUrl = (config?.baseUrl ?? "https://orbexa.io").replace(/\/$/, "");
    this.timeout = config?.timeout ?? 15_000;
    this.fetchFn = config?.fetchFn ?? globalThis.fetch;
  }

  /**
   * Verify a merchant's trust score.
   *
   * @param domain - Merchant domain (e.g., "nike.com")
   * @returns Trust verification result with 7-dimension breakdown
   * @throws OtrApiError if domain not found or API error
   */
  async verify(domain: string): Promise<OtrVerifyResult> {
    const cleanDomain = normalizeDomain(domain);
    const response = await this.request(
      `/api/otr/verify/${encodeURIComponent(cleanDomain)}`,
    );

    if (response.status === 404) {
      throw new OtrApiError(
        `Domain "${cleanDomain}" not found in OTR registry`,
        404,
        cleanDomain,
      );
    }

    if (!response.ok) {
      throw new OtrApiError(
        `OTR API error: ${response.status}`,
        response.status,
        cleanDomain,
      );
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
   * @returns Paginated search results
   */
  async search(query?: OtrSearchQuery): Promise<OtrSearchResult> {
    const params = new URLSearchParams();
    if (query?.query) params.set("q", query.query);
    if (query?.category) params.set("category", query.category);
    if (query?.badge) params.set("badge", query.badge);
    if (query?.minScore !== undefined)
      params.set("minScore", String(query.minScore));
    params.set("limit", String(Math.min(query?.limit ?? 10, 50)));
    params.set("page", String(query?.page ?? 1));

    const response = await this.request(
      `/api/otr/registry?${params.toString()}`,
    );

    if (!response.ok) {
      throw new OtrApiError(
        `OTR API error: ${response.status}`,
        response.status,
      );
    }

    return (await response.json()) as OtrSearchResult;
  }

  /**
   * Get registry statistics.
   *
   * @returns Registry stats (total merchants, badge distribution)
   */
  async stats(): Promise<OtrStats> {
    const response = await this.request("/api/otr/stats");

    if (!response.ok) {
      throw new OtrApiError(
        `OTR API error: ${response.status}`,
        response.status,
      );
    }

    return (await response.json()) as OtrStats;
  }

  // ── Internal ──

  private async request(path: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      return await this.fetchFn(`${this.baseUrl}${path}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "@otr-protocol/sdk/3.1.0",
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
