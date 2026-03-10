/**
 * Example: Using the OTR SDK to verify merchants
 *
 * Run: npx tsx examples/sdk-usage.ts
 *
 * Note: Requires a running OTR API (defaults to https://api.orbexa.io)
 */

import { OtrClient, OtrApiError } from "../packages/sdk/src/index";

async function main(): Promise<void> {
  const otr = new OtrClient({
    // baseUrl: "http://localhost:3000",  // Use local API for testing
  });

  // 1. Verify a domain
  console.log("Verifying nike.com...\n");
  try {
    const result = await otr.verify("nike.com");
    console.log(`  Score: ${result.trustScore}`);
    console.log(`  Badge: ${result.badge}`);
    console.log(`  Dimensions:`, result.trustDimensions);
  } catch (error: unknown) {
    if (error instanceof OtrApiError && error.status === 404) {
      console.log("  Domain not found in registry");
    } else {
      console.log(`  Error: ${error instanceof Error ? error.message : "Unknown"}`);
    }
  }

  // 2. Check if a domain exists
  console.log("\nChecking if example.com exists...");
  const exists = await otr.exists("example.com");
  console.log(`  Exists: ${exists}`);

  // 3. Search the registry
  console.log("\nSearching for Electronics merchants with GOLD+ badge...");
  try {
    const results = await otr.search({
      category: "Electronics",
      badge: "GOLD",
      limit: 5,
    });
    console.log(`  Found ${results.total} merchants`);
    for (const m of results.merchants) {
      console.log(`    ${m.domain} — ${m.trustScore} (${m.badge})`);
    }
  } catch (error: unknown) {
    console.log(`  Error: ${error instanceof Error ? error.message : "Unknown"}`);
  }
}

main().catch(console.error);
