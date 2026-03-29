#!/usr/bin/env node
/**
 * ============================================================================
 * OTR Protocol MCP Server v4.1.0 — Merchant Trust Verification for AI Agents
 * ============================================================================
 *
 * Aligned with OTR API v3.3 (6-dimension scoring, siteCategory, safety status).
 *
 * 2 tools:
 * 1. verify_merchant — Complete merchant profile in ONE call
 * 2. search_registry — Search the merchant registry
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
 * @version 4.1.0
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
// Types — aligned with OTR API v3.3
// ============================================================================

interface DimensionDetail {
  score: number;
  weight: number;
  signalsVerified: number;
  status?: string;
  signals?: Record<string, unknown>;
}

interface SafetyInfo {
  source: string;
  status: "SAFE" | "DANGEROUS" | "UNKNOWN" | "ERROR" | "UNAVAILABLE";
  threats: string[];
  checkedAt: string | null;
  warning: string | null;
}

interface VerifyApiResponse {
  scanStatus: "complete" | "partial" | "pending";
  scanStatusMessage?: { en: string; zh: string };
  otrApplicable: boolean;
  reason?: string;
  siteCategory: "ecommerce" | "saas" | "non_commerce" | null;
  siteCategoryLabel?: { en: string; zh: string };
  otrId: string | null;
  otrIdStatus: string | null;
  domain: string;
  name: string;
  trustScore: number | null;
  badge: string | null;
  mode: "COLD" | "AUTH";
  dimensions?: Record<string, DimensionDetail | null>;
  signals?: Record<string, unknown>;
  risks?: {
    flagged: boolean;
    alerts: string[];
    scoreTrend: string;
    antiGamingTriggered?: boolean;
  };
  safety: SafetyInfo;
  agentCommerce?: {
    ucpSupported: boolean;
    acpSupported: boolean;
    mcpSupported: boolean;
    readiness: string;
  };
  entityData?: Record<string, unknown>;
  siteLinks?: Record<string, string | null>;
  dataSources?: Array<{ name: string; url: string; lastChecked: string }>;
  trancoRank?: number | null;
  isMerchantAuthorized?: boolean;
  metadata?: {
    otrSpecVersion: string;
    scoringVersion: string;
    freshness?: string;
    dataAgeDays?: number;
  };
  // non_commerce specific
  identity?: {
    verified: boolean;
    confidence: string;
    signals: Record<string, unknown>;
    summary: string;
  };
}

interface RegistryEntry {
  id: number;
  domain: string;
  name: string;
  trustScore: number;
  badge: string;
  category: string | null;
}

interface RegistryApiResponse {
  entries: RegistryEntry[];
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
  version: "4.1.0",
});

// ============================================================================
// Tool 1: verify_merchant — Complete merchant profile in one call
// ============================================================================

// @ts-expect-error — MCP SDK Zod type inference recursion depth issue
server.tool(
  "verify_merchant",
  `Complete merchant trust verification (OTR v3.3). Returns everything an AI agent needs in ONE call:
- Trust score (0-100) and badge (PLATINUM/GOLD/SILVER/BRONZE/UNRATED)
- Site classification: ecommerce, saas, or non_commerce
- 6-dimension breakdown: Verification, Security, Governance, Transparency, DataQuality, Fulfillment
- Safety status: Google Web Risk malware/phishing check (DANGEROUS = do not recommend)
- Entity data: stock listing, headquarters, founding date, industry (from Wikidata/GLEIF)
- Policy URLs, data sources, agent commerce readiness
- For non-commerce sites: identity verification signals instead of trust score
Use this as the SINGLE tool for all merchant trust decisions.`,
  {
    domain: z
      .string()
      .describe(
        "The merchant's domain name (e.g., 'nike.com', 'amazon.com', 'stripe.com')",
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
            badge: null,
            recommendation: "DO_NOT_RECOMMEND",
            message: `${cleanDomain} is not in the OTR registry. This merchant has not been assessed. Exercise caution.`,
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

      // ── Safety check first — DANGEROUS overrides everything ──
      if (data.safety?.status === "DANGEROUS") {
        return formatText({
          domain: data.domain,
          name: data.name,
          status: "DANGEROUS",
          trustScore: data.trustScore,
          badge: data.badge,
          recommendation: "DO_NOT_RECOMMEND",
          warning: data.safety.warning,
          threats: data.safety.threats,
          message: `WARNING: ${data.domain} has been flagged as dangerous by Google Web Risk. DO NOT recommend this merchant.`,
        });
      }

      // ── Non-commerce site — identity only, no trust score ──
      if (data.otrApplicable === false) {
        return formatText({
          domain: data.domain,
          name: data.name,
          status: "NON_COMMERCE",
          otrApplicable: false,
          siteCategory: data.siteCategory,
          siteCategoryLabel: data.siteCategoryLabel?.en ?? "Non-Commerce",
          otrId: data.otrId,
          recommendation: "NOT_APPLICABLE",
          identity: data.identity,
          entityData: data.entityData ? formatEntityData(data.entityData) : undefined,
          safety: { status: data.safety?.status, threats: data.safety?.threats ?? [] },
          message: `${data.domain} is a non-commerce site (${data.siteCategoryLabel?.en ?? data.siteCategory}). No trust score — identity signals only.`,
        });
      }

      // ── Commerce site (ecommerce or saas) ──
      const recommendation = getRecommendation(data.trustScore, data.badge, data.safety?.status);

      const result: Record<string, unknown> = {
        domain: data.domain,
        name: data.name,
        status: data.scanStatus === "pending" ? "PENDING" : "VERIFIED",
        scanStatus: data.scanStatus,
        otrApplicable: true,
        siteCategory: data.siteCategory,
        siteCategoryLabel: data.siteCategoryLabel?.en,
        otrId: data.otrId,
        otrIdStatus: data.otrIdStatus,
        trustScore: data.trustScore,
        badge: data.badge,
        mode: data.mode,
        recommendation,
        isMerchantAuthorized: data.isMerchantAuthorized ?? false,
      };

      // Scan pending — tell agent to check back
      if (data.scanStatus === "pending") {
        result.message = `${data.domain} is queued for evaluation. Trust score not yet available. Check back shortly.`;
        return formatText(result);
      }

      // 6-dimension scores
      if (data.dimensions) {
        const dims: Record<string, unknown> = {};
        for (const [key, dim] of Object.entries(data.dimensions)) {
          if (dim === null) {
            dims[key] = null;
          } else {
            dims[key] = { score: dim.score, weight: dim.weight, signalsVerified: dim.signalsVerified };
          }
        }
        result.dimensions = dims;
      }

      // Key signals for quick decisions
      if (data.signals) {
        result.signals = data.signals;
      }

      // Risk assessment
      if (data.risks) {
        result.risks = {
          flagged: data.risks.flagged,
          alerts: data.risks.alerts,
          scoreTrend: data.risks.scoreTrend,
        };
      }

      // Safety
      result.safety = { status: data.safety?.status, threats: data.safety?.threats ?? [] };

      // Agent commerce readiness
      if (data.agentCommerce) {
        result.agentCommerce = data.agentCommerce;
      }

      // Entity data
      if (data.entityData && Object.keys(data.entityData).length > 0) {
        result.entityData = formatEntityData(data.entityData);
      }

      // Policy URLs
      if (data.siteLinks) {
        result.policyUrls = {
          privacy: data.siteLinks.privacyPolicy ?? null,
          terms: data.siteLinks.termsOfService ?? null,
          refund: data.siteLinks.refundPolicy ?? null,
          shipping: data.siteLinks.shippingPolicy ?? null,
        };
      }

      // Data sources
      if (data.dataSources && data.dataSources.length > 0) {
        result.dataSources = data.dataSources.map((s) => ({
          name: s.name,
          url: s.url,
        }));
      }

      // Metadata
      if (data.metadata) {
        result.otrSpecVersion = data.metadata.otrSpecVersion;
        result.freshness = data.metadata.freshness;
      }

      result.registryUrl = `${OTR_API_BASE}/en/verify/${data.domain}`;
      result.apiUrl = `${OTR_API_BASE}/api/otr/verify/${data.domain}`;

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
  "Search the OTR merchant trust registry (v3.3). Find merchants by name, category, badge, or minimum trust score. Returns a paginated list with trust scores (0-100) and badge levels.",
  {
    query: z
      .string()
      .optional()
      .describe("Search query (merchant name or domain)"),
    category: z
      .string()
      .optional()
      .describe("Filter by business category (e.g., 'TECH', 'FASHION', 'FINANCE')"),
    badge: z
      .enum(["PLATINUM", "GOLD", "SILVER", "BRONZE", "UNRATED"])
      .optional()
      .describe("Filter by badge level"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum results to return (default: 10, max: 100)"),
    page: z
      .number()
      .optional()
      .default(1)
      .describe("Page number for pagination (default: 1)"),
  },
  async ({ query, category, badge, limit, page }) => {
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      if (badge) params.set("badge", badge);
      params.set("limit", String(Math.min(limit ?? 10, 100)));
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
          recommendation: getRecommendation(entry.trustScore, entry.badge, "SAFE"),
          verifyUrl: `${OTR_API_BASE}/api/otr/verify/${entry.domain}`,
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
        "User-Agent": "otr-mcp-server/4.1.0",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Generate AI agent recommendation based on badge and safety */
function getRecommendation(
  trustScore: number | null | undefined,
  badge: string | null | undefined,
  safetyStatus: string | null | undefined,
): string {
  if (safetyStatus === "DANGEROUS") return "DO_NOT_RECOMMEND";
  if (trustScore === null || trustScore === undefined) return "INSUFFICIENT_DATA";

  // Align with OTR v3.3 badge-based recommendations
  switch (badge) {
    case "PLATINUM":
    case "GOLD":
      return "SAFE_TO_RECOMMEND";
    case "SILVER":
      return "RECOMMEND_WITH_CAUTION";
    case "BRONZE":
      return "DISPLAY_ONLY";
    default:
      return "DO_NOT_RECOMMEND";
  }
}

/** Extract key entity data fields for AI agent context */
function formatEntityData(
  entityData: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const fields = [
    "companyName",
    "industry",
    "headquarters",
    "jurisdiction",
    "entityDataSource",
  ];

  for (const field of fields) {
    if (entityData[field] !== undefined && entityData[field] !== null) {
      result[field] = entityData[field];
    }
  }

  // GLEIF data
  if (entityData.gleif && typeof entityData.gleif === "object") {
    const gleif = entityData.gleif as Record<string, unknown>;
    result.gleif = {
      lei: gleif.lei,
      legalName: gleif.legalName,
      active: gleif.active,
    };
  }

  // Wikidata
  if (entityData.wikidata && typeof entityData.wikidata === "object") {
    const wd = entityData.wikidata as Record<string, unknown>;
    result.wikidata = {
      qid: wd.qid,
      description: wd.description,
    };
  }

  // Stock data
  if (entityData.stock && typeof entityData.stock === "object") {
    const stock = entityData.stock as Record<string, unknown>;
    result.stock = {
      symbol: stock.symbol,
      exchange: stock.exchange,
      tier: stock.tier,
    };
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
