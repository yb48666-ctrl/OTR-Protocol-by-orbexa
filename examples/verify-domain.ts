/**
 * Example: Verify a domain using @otr-protocol/core
 *
 * Run: npx tsx examples/verify-domain.ts
 */

import {
  calculateTrustScore,
  type ScoringEvidence,
} from "../packages/core/src/index";

// Nike — a major brand with strong identity signals
const nikeEvidence: ScoringEvidence = {
  // Identity (unforgeable)
  hasSecFiling: true,
  hasStockSymbol: true,
  stockExchange: "NYSE",
  hasWikidataId: true,
  hasCorporateRegistry: false,
  hasWhoisData: false,
  hasParentCompany: false,
  hasFoundedYear: true,
  companyAge: 62,
  hasHeadquarters: true,
  trancoRank: 500,
  category: "Fashion & Apparel",

  // Technical
  sslType: "OV",
  dmarcPolicy: "reject",
  hasSpf: true,
  hasDkim: true,
  hasHsts: true,
  hasCaa: true,
  hasSecurityTxt: false,
  hasMtaSts: false,

  // Compliance
  complianceStatus: "PENDING",
  complianceEvidence: "",
  complianceScore: 0,

  // PolicyScore
  hasPrivacyPolicy: true,
  privacyHasGdpr: true,
  privacyHasCcpa: true,
  hasRefundPolicy: true,
  policyReturnWindowDays: 30,
  hasTermsOfService: true,
  hasCookieConsent: true,

  // WebPresence
  hasRobotsTxt: true,
  robotsAllowsCrawlers: true,
  hasSitemap: true,
  hasSchemaOrg: true,
  hasOrgSchemaComplete: true,
  hasMultiLang: true,
  hasViewport: true,
  hasFavicon: true,
  pageHasContent: true,

  // DataQuality (not available without merchant API)
  hasProductCatalog: false,
  hasPricingData: false,
  hasInventorySync: false,
  hasRichMedia: false,
  hasStructuredData: false,

  // Fulfillment (not available without merchant API)
  hasShippingPolicy: false,
  hasReturnPolicy: false,
  avgDeliveryDays: null,
  returnWindowDays: null,
  hasOrderTracking: false,
};

const result = calculateTrustScore(nikeEvidence);

console.log("OTR Trust Verification — nike.com");
console.log("=".repeat(40));
console.log(`Trust Score: ${result.trustScore}/94`);
console.log(`Badge:       ${result.badge}`);
console.log(`Tier:        ${result.tier}`);
console.log(`Confidence:  ${result.dataConfidence}`);
console.log("");
console.log("Dimension Breakdown:");
console.log(`  Identity:     ${result.dimensions.identity}`);
console.log(`  Technical:    ${result.dimensions.technical}`);
console.log(`  Compliance:   ${result.dimensions.compliance}`);
console.log(`  PolicyScore:  ${result.dimensions.policyScore}`);
console.log(`  WebPresence:  ${result.dimensions.webPresence}`);
console.log(`  DataQuality:  ${result.dimensions.dataQuality}`);
console.log(`  Fulfillment:  ${result.dimensions.fulfillment}`);
