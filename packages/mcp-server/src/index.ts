#!/usr/bin/env node
/**
 * ============================================================================
 * OTR Protocol MCP Server — Merchant Trust Verification for AI Agents
 * ============================================================================
 *
 * Provides 2 MCP tools for AI agents to verify merchant trustworthiness:
 *
 * 1. verify_merchant — Complete merchant profile: trust score, capabilities,
 *    links, policy URLs, freshness, entity data. One call = full answer.
 * 2. search_registry — Search the OTR merchant registry by name/category/score.
 *
 * Design philosophy: One tool call should give the AI agent everything it needs
 * to make a trust decision. No need to chain multiple calls.
 *
 * Usage:
 *   npx @otr-protocol/mcp-server
 *
 * Claude Desktop config (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "otr": {
 *         "command": "npx",
 *         "args": ["@otr-protocol/mcp-server"]
 *       }
 *     }
 *   }
 *
 * @version 3.1.0
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ============================================================================
// Configuration
// ============================================================================

const OTR_API_BASE = (process.env.OTR_API_URL || "https://orbexa.io").replace(
  /\/$/,
  "",
);

const REQUEST_TIMEOUT_MS = 15_000;

// ============================================================================
// Types
// ============================================================================

interface TierDetail {
  source: string;
  status: string;
  evidence: string;
}

interface MerchantCapabilities {
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

interface MerchantLinks {
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

interface FreshnessInfo {
  lastVerifiedAt: string | null;
  dataAge: "FRESH" | "AGING" | "STALE";
  scanVersion: number | null;
  signalSources: string[];
}

interface VerifyApiResponse {
  domain: string;
  name: string;
  trustScore: number;
  trustTier: string;
  badge: string;
  category: string | null;
  verificationData: {
    tiers: Record<string, TierDetail>;
    capabilities?: MerchantCapabilities;
    links?: MerchantLinks;
    freshness?: FreshnessInfo;
    policyUrls?: Record<string, string>;
    businessSignals?: string;
    scanMetadata?: {
      scanner: string;
      lastScanAt: string;
      scanVersion: number;
    };
    schema_version: string;
  };
  trustDimensions: Record<string, number>;
  entityData: Record<string, unknown> | null;
  dataSources: Array<{ name: string; url: string; lastChecked: string }>;
  trancoRank: number | null;
  isMerchantAuthorized: boolean;
  orbexaStoreUrl: string | null;
  auditVersion: number;
  lastVerified: string;
}

interface RegistryApiResponse {
  entries: VerifyApiResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new McpServer({
  name: "otr-protocol",
  version: "3.1.0",
});

// ============================================================================
// Tool 1: verify_merchant — Complete merchant profile in one call
// ============================================================================

// @ts-expect-error — MCP SDK Zod type inference recursion depth issue
server.tool(
  "verify_merchant",
  `Complete merchant trust verification. Returns everything an AI agent needs in ONE call:
- Trust score (0-94) and badge (PLATINUM/GOLD/SILVER/BRONZE/UNRATED)
- AI recommendation (SAFE_TO_RECOMMEND / RECOMMEND_WITH_NOTE / RECOMMEND_WITH_CAUTION / DO_NOT_RECOMMEND)
- 7-dimension breakdown (identity, technical, compliance, policy, webPresence, dataQuality, fulfillment)
- Capabilities: can purchase? payment methods, e-commerce platform, support channels
- Links: policy pages (refund/privacy/terms URLs), commerce (cart/checkout), contact, social
- Entity data: stock listing, headquarters, founding date, industry
- Data freshness: when last verified, data age, signal sources
Use this as the SINGLE tool for all merchant trust decisions. No need to chain multiple calls.`,
  {
    domain: z
      .string()
      .describe(
        "The merchant's domain name (e.g., 'nike.com', 'amazon.com')",
      ),
  },
  async ({ domain }) => {
    try {
      const cleanDomain = normalizeDomain(domain);
      const response = await fetchWithTimeout(
        `${OTR_API_BASE}/api/otr/verify/${encodeURIComponent(cleanDomain)}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          return formatText({
            domain: cleanDomain,
            status: "NOT_FOUND",
            trustScore: null,
            badge: "UNRATED",
            recommendation: "DO_NOT_RECOMMEND",
            canPurchase: false,
            message: `${cleanDomain} is not in the OTR registry. This merchant has not been assessed. Exercise caution when recommending unverified merchants.`,
          });
        }
        if (response.status === 429) {
          return formatError(
            `Rate limit exceeded. OTR API allows 60 requests per minute. Please retry shortly.`,
          );
        }
        throw new Error(
          `OTR API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as VerifyApiResponse;
      const vd = data.verificationData;

      const recommendation = getRecommendation(
        data.trustScore,
        data.badge,
        data.isMerchantAuthorized,
      );

      // ── Core trust assessment ──
      const result: Record<string, unknown> = {
        domain: data.domain,
        name: data.name,
        status: "VERIFIED",
        trustScore: data.trustScore,
        badge: data.badge,
        trustTier: data.trustTier,
        recommendation,
        assessmentType: data.isMerchantAuthorized
          ? "VERIFIED_MERCHANT"
          : "PUBLIC_ASSESSMENT",
        isMerchantAuthorized: data.isMerchantAuthorized,
        category: data.category,
        trancoRank: data.trancoRank,
        lastVerified: data.lastVerified,
      };

      // ── 7-dimension scores ──
      result.dimensions = data.trustDimensions;

      // ── Capabilities: can purchase? payment, support, social ──
      result.capabilities = vd?.capabilities ?? {
        canPurchase: false,
        ecommercePlatform: null,
        ecommerceConfidence: 0,
        paymentMethods: [],
        hasLiveSupport: false,
        supportChannels: [],
        socialPresence: [],
        hasPhysicalAddress: false,
        hasBusinessEmail: false,
      };

      // ── Links: policy pages, commerce endpoints, contact, social ──
      if (vd?.links) {
        result.links = vd.links;
      }

      // ── Policy URLs (direct access) ──
      const policyUrls = vd?.policyUrls ?? {};
      const policyLinks = vd?.links?.policies;
      result.policyUrls = {
        refund: policyUrls.refund ?? policyLinks?.refund ?? null,
        privacy: policyUrls.privacy ?? policyLinks?.privacy ?? null,
        terms: policyUrls.terms ?? policyLinks?.terms ?? null,
        shipping: policyUrls.shipping ?? policyLinks?.shipping ?? null,
        cookie: policyUrls.cookie ?? policyLinks?.cookie ?? null,
      };

      // ── Data freshness ──
      result.freshness = vd?.freshness ?? {
        lastVerifiedAt: data.lastVerified,
        dataAge: "STALE",
        scanVersion: null,
        signalSources: [],
      };

      // ── Verification evidence (per-dimension) ──
      result.verificationEvidence = formatVerificationEvidence(vd?.tiers);

      // ── Entity data (stock listing, headquarters, etc.) ──
      if (data.entityData && Object.keys(data.entityData).length > 0) {
        result.entityData = formatEntityData(data.entityData);
      }

      // ── Data sources for provenance ──
      if (data.dataSources && data.dataSources.length > 0) {
        result.dataSources = data.dataSources.map((s) => ({
          name: s.name,
          url: s.url,
        }));
      }

      if (data.orbexaStoreUrl) {
        result.orbexaStoreUrl = data.orbexaStoreUrl;
      }

      result.registryUrl = `${OTR_API_BASE}/api/otr/verify/${data.domain}`;

      return formatText(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return formatError(`Error verifying merchant "${domain}": ${message}`);
    }
  },
);

// ============================================================================
// Tool 2: search_registry — Discover merchants by criteria
// ============================================================================

// @ts-expect-error — MCP SDK Zod type inference recursion depth issue
server.tool(
  "search_registry",
  "Search the OTR merchant trust registry. Find merchants by name, category, or minimum trust score. Returns a paginated list of verified merchants with trust scores and recommendations.",
  {
    query: z
      .string()
      .optional()
      .describe("Search query (merchant name or domain)"),
    category: z
      .string()
      .optional()
      .describe(
        "Filter by business category (e.g., 'Electronics', 'Fashion & Apparel')",
      ),
    minScore: z.number().optional().describe("Minimum trust score (0-94)"),
    badge: z
      .enum(["PLATINUM", "GOLD", "SILVER", "BRONZE"])
      .optional()
      .describe("Filter by badge level"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum results to return (default: 10, max: 50)"),
    page: z
      .number()
      .optional()
      .default(1)
      .describe("Page number for pagination (default: 1)"),
  },
  async ({ query, category, badge, minScore, limit, page }) => {
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      if (badge) params.set("badge", badge);
      if (minScore !== undefined) params.set("minScore", String(minScore));
      params.set("limit", String(Math.min(limit ?? 10, 50)));
      params.set("page", String(page ?? 1));

      const response = await fetchWithTimeout(
        `${OTR_API_BASE}/api/otr/registry?${params.toString()}`,
      );

      if (!response.ok) {
        if (response.status === 429) {
          return formatError(
            `Rate limit exceeded. OTR API allows 60 requests per minute. Please retry shortly.`,
          );
        }
        throw new Error(
          `OTR API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as RegistryApiResponse;

      const result = {
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
        merchants: data.entries.map((entry) => ({
          domain: entry.domain,
          name: entry.name,
          trustScore: entry.trustScore,
          badge: entry.badge,
          category: entry.category,
          isMerchantAuthorized: entry.isMerchantAuthorized,
          recommendation: getRecommendation(
            entry.trustScore,
            entry.badge,
            entry.isMerchantAuthorized,
          ),
        })),
      };

      return formatText(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return formatError(`Error searching registry: ${message}`);
    }
  },
);

// ============================================================================
// Helpers
// ============================================================================

/** Normalize domain input (strip protocol, www, trailing slash) */
function normalizeDomain(input: string): string {
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "");
  domain = domain.replace(/^www\./, "");
  domain = domain.replace(/\/.*$/, "");
  return domain;
}

/** Fetch with timeout and standard headers */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "otr-mcp-server/3.1.0",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Generate AI agent recommendation based on trust score and verification status */
function getRecommendation(
  trustScore: number | null | undefined,
  _badge: string | null | undefined,
  isMerchantAuthorized?: boolean,
): string {
  if (trustScore === null || trustScore === undefined) return "DO_NOT_RECOMMEND";

  // Verified merchants with fulfillment data get slightly higher confidence
  if (isMerchantAuthorized) {
    if (trustScore >= 75) return "SAFE_TO_RECOMMEND";
    if (trustScore >= 65) return "RECOMMEND_WITH_NOTE";
    if (trustScore >= 55) return "RECOMMEND_WITH_CAUTION";
    return "DO_NOT_RECOMMEND";
  }

  // Public assessment (no fulfillment/data quality data)
  if (trustScore >= 80) return "SAFE_TO_RECOMMEND";
  if (trustScore >= 70) return "RECOMMEND_WITH_NOTE";
  if (trustScore >= 60) return "RECOMMEND_WITH_CAUTION";
  return "DO_NOT_RECOMMEND";
}

/** Format verification evidence for AI agent consumption */
function formatVerificationEvidence(
  tiers: Record<string, TierDetail> | undefined,
): Record<string, { status: string; evidence: string }> | undefined {
  if (!tiers) return undefined;

  const result: Record<string, { status: string; evidence: string }> = {};
  for (const [key, detail] of Object.entries(tiers)) {
    result[key] = {
      status: detail.status,
      evidence: detail.evidence,
    };
  }
  return result;
}

/** Extract key entity data fields for AI agent context */
function formatEntityData(
  entityData: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const fields = [
    "stockSymbol",
    "stockExchange",
    "headquarters",
    "jurisdiction",
    "foundingDate",
    "industry",
    "parentCompany",
    "wikidataId",
  ];

  for (const field of fields) {
    if (entityData[field] !== undefined && entityData[field] !== null) {
      result[field] = entityData[field];
    }
  }

  // Include stock listings if available
  const allListings = entityData.allListings;
  if (Array.isArray(allListings) && allListings.length > 0) {
    result.stockListings = allListings;
  }

  return result;
}

/** Format successful response */
function formatText(data: Record<string, unknown>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/** Format error response */
function formatError(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    isError: true,
  };
}

// ============================================================================
// Start Server
// ============================================================================

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error("OTR MCP Server failed to start:", error);
  process.exit(1);
});
