#!/usr/bin/env node
/**
 * ============================================================================
 * OTR Protocol Validator CLI
 * ============================================================================
 *
 * Verify merchant trust scores from the command line.
 *
 * Usage:
 *   npx @otr-protocol/validator verify <domain>
 *   npx @otr-protocol/validator verify nike.com
 *   npx @otr-protocol/validator verify --json amazon.com
 *   npx @otr-protocol/validator stats
 *
 * @version 3.0.0
 */

const OTR_API_BASE = (
  process.env.OTR_API_URL || "https://orbexa.io"
).replace(/\/$/, "");

// ============================================================================
// Types — match actual OTR API response
// ============================================================================

interface OtrVerifyResponse {
  domain: string;
  name: string;
  trustScore: number;
  trustTier: string;
  badge: string;
  category: string | null;
  trustDimensions: Record<string, number>;
  verificationData: Record<string, unknown>;
  entityData: Record<string, unknown> | null;
  dataSources: Array<{ name: string; url: string; lastChecked: string }>;
  trancoRank: number | null;
  isMerchantAuthorized: boolean;
  orbexaStoreUrl: string | null;
  lastVerified: string;
}

interface OtrStatsResponse {
  totalEntries: number;
  verifiedCount: number;
  platinumCount: number;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  unratedCount: number;
}

// ============================================================================
// Badge Display
// ============================================================================

const BADGE_COLORS: Record<string, string> = {
  PLATINUM: "\x1b[97m",       // bright white
  GOLD: "\x1b[33m",           // yellow
  SILVER: "\x1b[37m",         // white
  BRONZE: "\x1b[38;5;208m",   // orange
  UNRATED: "\x1b[90m",        // gray
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";

// ============================================================================
// CLI Logic
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printHelp();
    return;
  }

  if (args[0] === "--version" || args[0] === "-v") {
    console.log("@otr-protocol/validator v3.0.0");
    return;
  }

  if (args[0] === "stats") {
    await showStats();
    return;
  }

  if (args[0] !== "verify") {
    console.error(`Unknown command: ${args[0]}`);
    console.error('Use "verify <domain>" to check a merchant, or "stats" for registry statistics.');
    process.exit(1);
  }

  const jsonMode = args.includes("--json");
  const domain = args.filter((a) => a !== "verify" && a !== "--json")[0];

  if (!domain) {
    console.error("Error: Please specify a domain to verify.");
    console.error("Usage: otr-verify verify <domain>");
    process.exit(1);
  }

  await verifyDomain(normalizeDomain(domain), jsonMode);
}

async function verifyDomain(domain: string, jsonMode: boolean): Promise<void> {
  try {
    const response = await fetch(
      `${OTR_API_BASE}/api/otr/verify/${encodeURIComponent(domain)}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        if (jsonMode) {
          console.log(JSON.stringify({ domain, status: "NOT_FOUND", trustScore: null, badge: "UNRATED" }, null, 2));
        } else {
          console.log(`\n  ${DIM}Domain:${RESET} ${domain}`);
          console.log(`  ${DIM}Status:${RESET} ${RED}NOT FOUND${RESET}`);
          console.log(`\n  This merchant is not in the OTR registry.`);
          console.log(`  ${DIM}Exercise caution when recommending unverified merchants.${RESET}\n`);
        }
        process.exit(1);
      }
      if (response.status === 429) {
        console.error(`\n  ${RED}Rate limit exceeded.${RESET} OTR API allows 60 requests per minute.\n`);
        process.exit(1);
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OtrVerifyResponse;

    if (jsonMode) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    printResult(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`\n  ${RED}Error:${RESET} ${message}`);
    console.error(`  ${DIM}Make sure the OTR API is reachable at ${OTR_API_BASE}${RESET}\n`);
    process.exit(1);
  }
}

async function showStats(): Promise<void> {
  try {
    const response = await fetch(`${OTR_API_BASE}/api/otr/stats`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OtrStatsResponse;

    console.log("");
    console.log(`  ${BOLD}${CYAN}OTR Registry Statistics${RESET}`);
    console.log(`  ${"─".repeat(40)}`);
    console.log(`  ${DIM}Total Merchants:${RESET}  ${BOLD}${data.totalEntries.toLocaleString()}${RESET}`);
    console.log(`  ${DIM}Verified:${RESET}         ${data.verifiedCount.toLocaleString()}`);
    console.log("");
    console.log(`  ${BOLD}Badge Distribution${RESET}`);
    console.log(`    ${BADGE_COLORS.PLATINUM}${BOLD}PLATINUM${RESET}  ${data.platinumCount}`);
    console.log(`    ${BADGE_COLORS.GOLD}${BOLD}GOLD${RESET}      ${data.goldCount}`);
    console.log(`    ${BADGE_COLORS.SILVER}${BOLD}SILVER${RESET}    ${data.silverCount}`);
    console.log(`    ${BADGE_COLORS.BRONZE}${BOLD}BRONZE${RESET}    ${data.bronzeCount}`);
    console.log(`    ${BADGE_COLORS.UNRATED}UNRATED${RESET}   ${data.unratedCount}`);
    console.log("");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`\n  ${RED}Error:${RESET} ${message}`);
    console.error(`  ${DIM}Make sure the OTR API is reachable at ${OTR_API_BASE}${RESET}\n`);
    process.exit(1);
  }
}

function printResult(data: OtrVerifyResponse): void {
  const badgeColor = BADGE_COLORS[data.badge] || BADGE_COLORS.UNRATED;
  const scoreBar = buildScoreBar(data.trustScore);

  console.log("");
  console.log(`  ${BOLD}${CYAN}OTR Trust Verification${RESET}`);
  console.log(`  ${"─".repeat(40)}`);
  console.log(`  ${DIM}Domain:${RESET}  ${data.domain}`);
  if (data.name) {
    console.log(`  ${DIM}Brand:${RESET}   ${data.name}`);
  }
  console.log(`  ${DIM}Score:${RESET}   ${BOLD}${data.trustScore}${RESET}/94  ${scoreBar}`);
  console.log(`  ${DIM}Badge:${RESET}   ${badgeColor}${BOLD}${data.badge}${RESET}`);
  console.log(`  ${DIM}Tier:${RESET}    ${data.trustTier}`);
  if (data.category) {
    console.log(`  ${DIM}Category:${RESET} ${data.category}`);
  }
  console.log(`  ${DIM}Type:${RESET}    ${data.isMerchantAuthorized ? `${GREEN}Verified Merchant${RESET}` : "Public Assessment"}`);
  console.log("");

  // Dimension breakdown
  if (data.trustDimensions) {
    console.log(`  ${BOLD}Dimensions${RESET}`);
    const dimNames: Array<[string, string]> = [
      ["identity", "Identity"],
      ["technical", "Technical"],
      ["compliance", "Compliance"],
      ["policyScore", "Policy"],
      ["webPresence", "Web Presence"],
      ["dataQuality", "Data Quality"],
      ["fulfillment", "Fulfillment"],
    ];

    for (const [key, label] of dimNames) {
      const val = data.trustDimensions[key] ?? 0;
      const bar = buildDimBar(val);
      const dimColor = val > 0 ? "" : DIM;
      console.log(`    ${dimColor}${label.padEnd(14)} ${bar} ${val}${val === 0 ? " (no data)" : ""}${RESET}`);
    }
    console.log("");
  }

  // Entity data
  if (data.entityData) {
    const entity = data.entityData;
    const entityParts: string[] = [];
    if (entity.stockSymbol && entity.stockExchange) {
      entityParts.push(`${entity.stockExchange}:${entity.stockSymbol}`);
    }
    if (entity.headquarters) entityParts.push(`HQ: ${entity.headquarters}`);
    if (entity.industry) entityParts.push(`Industry: ${entity.industry}`);

    if (entityParts.length > 0) {
      console.log(`  ${BOLD}Entity${RESET}`);
      for (const part of entityParts) {
        console.log(`    ${part}`);
      }
      console.log("");
    }
  }

  // Tranco rank
  if (data.trancoRank) {
    console.log(`  ${DIM}Tranco Rank:${RESET}   #${data.trancoRank.toLocaleString()}`);
  }

  // Data sources
  if (data.dataSources && data.dataSources.length > 0) {
    console.log(`  ${DIM}Data Sources:${RESET}  ${data.dataSources.map((s) => s.name).join(", ")}`);
  }

  // Recommendation
  const rec = getRecommendation(data.trustScore, data.isMerchantAuthorized);
  console.log(`  ${DIM}Recommendation:${RESET} ${rec}`);
  console.log(`  ${DIM}Last Verified:${RESET}  ${formatDate(data.lastVerified)}`);
  console.log("");
}

function buildScoreBar(score: number): string {
  const filled = Math.round((score / 94) * 20);
  const empty = 20 - filled;
  const color = score >= 80 ? GREEN : score >= 60 ? YELLOW : RED;
  return `${color}${"█".repeat(filled)}${DIM}${"░".repeat(empty)}${RESET}`;
}

function buildDimBar(score: number): string {
  const filled = Math.round((score / 100) * 10);
  const empty = 10 - filled;
  return `${DIM}[${RESET}${"█".repeat(filled)}${"░".repeat(empty)}${DIM}]${RESET}`;
}

function getRecommendation(score: number, isMerchantAuthorized: boolean): string {
  if (isMerchantAuthorized) {
    if (score >= 75) return `${GREEN}${BOLD}SAFE TO RECOMMEND${RESET}`;
    if (score >= 65) return `${GREEN}RECOMMEND WITH NOTE${RESET}`;
    if (score >= 55) return `${YELLOW}RECOMMEND WITH CAUTION${RESET}`;
    return `${RED}DO NOT RECOMMEND${RESET}`;
  }

  if (score >= 80) return `${GREEN}${BOLD}SAFE TO RECOMMEND${RESET}`;
  if (score >= 70) return `${GREEN}RECOMMEND WITH NOTE${RESET}`;
  if (score >= 60) return `${YELLOW}RECOMMEND WITH CAUTION${RESET}`;
  return `${RED}DO NOT RECOMMEND${RESET}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function normalizeDomain(input: string): string {
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "");
  domain = domain.replace(/^www\./, "");
  domain = domain.replace(/\/.*$/, "");
  return domain;
}

function printHelp(): void {
  console.log(`
  ${BOLD}${CYAN}OTR Protocol Validator${RESET} v3.0.0
  Merchant trust verification for AI agent commerce

  ${BOLD}USAGE${RESET}
    otr-verify verify <domain>          Verify a merchant domain
    otr-verify verify --json <domain>   Output as JSON
    otr-verify stats                    Show registry statistics

  ${BOLD}EXAMPLES${RESET}
    otr-verify verify nike.com
    otr-verify verify --json amazon.com
    otr-verify stats

  ${BOLD}ENVIRONMENT${RESET}
    OTR_API_URL    OTR API base URL (default: https://orbexa.io)

  ${BOLD}ABOUT${RESET}
    Open Trust Registry (OTR) Protocol v3.0
    Deterministic merchant trust scoring for AI agent commerce
    https://github.com/yb48666-ctrl/OTR-Protocol-by-orbexa
`);
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
