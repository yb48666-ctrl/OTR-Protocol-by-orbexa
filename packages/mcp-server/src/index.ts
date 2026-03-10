#!/usr/bin/env node
/**
 * ============================================================================
 * OTR Protocol MCP Server — Merchant Trust Verification for AI Agents
 * ============================================================================
 *
 * Provides 3 MCP tools for AI agents to verify merchant trustworthiness:
 *
 * 1. verify_merchant   — Check trust score for a domain
 * 2. search_registry   — Search the OTR merchant registry
 * 3. get_refund_policy — Get machine-readable refund policy
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
 * @version 3.0.0
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ============================================================================
// Configuration
// ============================================================================

const OTR_API_BASE = process.env.OTR_API_URL || "https://api.orbexa.io";
const OTR_API_VERSION = "v1";

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new McpServer({
  name: "otr-protocol",
  version: "3.0.0",
});

// ============================================================================
// Tool 1: verify_merchant
// ============================================================================

// @ts-expect-error — MCP SDK Zod type inference recursion depth issue
server.tool(
  "verify_merchant",
  "Verify a merchant's trust score using the OTR Protocol. Returns trust score (0-94), badge (PLATINUM/GOLD/SILVER/BRONZE/UNRATED), 7-dimension breakdown, and verification evidence. Use this before recommending any merchant to a consumer.",
  {
    domain: z.string().describe("The merchant's domain name (e.g., 'nike.com', 'amazon.com')"),
  },
  async ({ domain }) => {
    try {
      const cleanDomain = normalizeDomain(domain);
      const response = await fetch(
        `${OTR_API_BASE}/api/otr/verify/${encodeURIComponent(cleanDomain)}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                domain: cleanDomain,
                status: "NOT_FOUND",
                message: `${cleanDomain} is not in the OTR registry. This merchant has not been assessed. Exercise caution when recommending unverified merchants.`,
                trustScore: null,
                badge: "UNRATED",
                recommendation: "DO_NOT_RECOMMEND",
              }, null, 2),
            }],
          };
        }
        throw new Error(`OTR API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as Record<string, unknown>;

      // Build structured response for AI agent
      const result = {
        domain: cleanDomain,
        status: "VERIFIED",
        trustScore: data.trustScore,
        badge: data.badge,
        tier: data.tier,
        dimensions: data.trustDimensions,
        recommendation: getRecommendation(data.trustScore as number, data.badge as string),
        verificationData: data.verificationData,
        lastUpdated: data.updatedAt,
        registryUrl: `${OTR_API_BASE}/api/otr/verify/${cleanDomain}`,
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `Error verifying merchant "${domain}": ${message}`,
        }],
        isError: true,
      };
    }
  },
);

// ============================================================================
// Tool 2: search_registry
// ============================================================================

// @ts-expect-error — MCP SDK Zod type inference recursion depth issue
server.tool(
  "search_registry",
  "Search the OTR merchant trust registry. Find merchants by name, category, or minimum trust score. Returns a list of verified merchants matching the criteria.",
  {
    query: z.string().optional().describe("Search query (merchant name or domain)"),
    category: z.string().optional().describe("Filter by business category (e.g., 'Electronics', 'Fashion & Apparel')"),
    minScore: z.number().optional().describe("Minimum trust score (0-94)"),
    badge: z.enum(["PLATINUM", "GOLD", "SILVER", "BRONZE"]).optional().describe("Filter by badge level"),
    limit: z.number().optional().default(10).describe("Maximum results to return (default: 10, max: 50)"),
  },
  async ({ query, category, badge, minScore, limit }) => {
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      if (badge) params.set("badge", badge);
      if (minScore !== undefined) params.set("minScore", String(minScore));
      params.set("limit", String(Math.min(limit ?? 10, 50)));

      const response = await fetch(
        `${OTR_API_BASE}/api/otr/registry?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`OTR API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as Record<string, unknown>;

      return {
        content: [{
          type: "text",
          text: JSON.stringify(data, null, 2),
        }],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `Error searching registry: ${message}`,
        }],
        isError: true,
      };
    }
  },
);

// ============================================================================
// Tool 3: get_refund_policy
// ============================================================================

server.tool(
  "get_refund_policy",
  "Get a merchant's refund and return policy in machine-readable format. Returns return window days, refund methods, conditions, and policy URL. Essential for AI agents handling purchase decisions.",
  {
    domain: z.string().describe("The merchant's domain name (e.g., 'nike.com')"),
  },
  async ({ domain }) => {
    try {
      const cleanDomain = normalizeDomain(domain);
      const response = await fetch(
        `${OTR_API_BASE}/api/otr/verify/${encodeURIComponent(cleanDomain)}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                domain: cleanDomain,
                status: "NOT_FOUND",
                message: `No refund policy data available for ${cleanDomain}. This merchant is not in the OTR registry.`,
              }, null, 2),
            }],
          };
        }
        throw new Error(`OTR API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as Record<string, unknown>;
      const vd = data.verificationData as Record<string, unknown> | undefined;
      const tiers = vd?.tiers as Record<string, Record<string, unknown>> | undefined;

      // Extract policy information from verification data
      const policyTier = tiers?.policyScore;
      const fulfillmentTier = tiers?.fulfillment;

      const result = {
        domain: cleanDomain,
        status: policyTier ? "AVAILABLE" : "LIMITED",
        refundPolicy: {
          hasRefundPolicy: policyTier?.evidence
            ? String(policyTier.evidence).includes("Refund")
            : false,
          hasReturnPolicy: fulfillmentTier?.evidence
            ? String(fulfillmentTier.evidence).includes("return")
            : false,
          policyEvidence: policyTier?.evidence ?? "No policy data scanned",
          fulfillmentEvidence: fulfillmentTier?.evidence ?? "No fulfillment data",
        },
        trustScore: data.trustScore,
        badge: data.badge,
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: `Error getting refund policy for "${domain}": ${message}`,
        }],
        isError: true,
      };
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

/** Generate AI agent recommendation based on trust score */
function getRecommendation(
  trustScore: number | null | undefined,
  badge: string | null | undefined,
): string {
  if (trustScore === null || trustScore === undefined) return "DO_NOT_RECOMMEND";

  if (trustScore >= 80) return "SAFE_TO_RECOMMEND";
  if (trustScore >= 70) return "RECOMMEND_WITH_NOTE";
  if (trustScore >= 60) return "RECOMMEND_WITH_CAUTION";
  return "DO_NOT_RECOMMEND";
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
