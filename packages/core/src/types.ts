/**
 * ============================================================================
 * OTR Protocol v4 — Core Type Definitions
 * ============================================================================
 *
 * Deterministic trust scoring types for AI agent commerce.
 * All types are pure TypeScript — no runtime dependencies.
 *
 * @version 4.0.0
 */

// ============================================================================
// Badge & Tier Constants
// ============================================================================

/** Trust badge levels */
export const BADGE_LEVELS = [
  "PLATINUM",
  "GOLD",
  "SILVER",
  "BRONZE",
  "UNRATED",
] as const;

/** Trust tier levels */
export const TIER_LEVELS = [
  "TIER_5",
  "TIER_4",
  "TIER_3",
  "TIER_2",
  "TIER_1",
] as const;

/** Data confidence levels (display-only, does NOT affect score) */
export const DATA_CONFIDENCE_LEVELS = [
  "HIGH_CONFIDENCE",
  "LOW_CONFIDENCE",
  "INSUFFICIENT",
] as const;

/** Verification tier statuses */
export const TIER_STATUSES = [
  "VERIFIED",
  "PARTIAL",
  "PENDING",
  "INFERRED",
  "FAILED",
] as const;

/** Anti-gaming severity levels */
export const ANTI_GAMING_SEVERITY = [
  "CLEAN",
  "SUSPICIOUS",
  "LIKELY_GAMING",
] as const;

// ============================================================================
// Type Aliases
// ============================================================================

export type Badge = (typeof BADGE_LEVELS)[number];
export type Tier = (typeof TIER_LEVELS)[number];
export type DataConfidence = (typeof DATA_CONFIDENCE_LEVELS)[number];
export type TierStatus = (typeof TIER_STATUSES)[number];
export type AntiGamingSeverity = (typeof ANTI_GAMING_SEVERITY)[number];

// ============================================================================
// Scoring Evidence — All inputs for trust computation
// ============================================================================

/**
 * ScoringEvidence — Complete input data for 7-dimension trust scoring.
 *
 * Two scoring phases:
 * - Public Assessment: Identity(0.45) + DataQuality(0.10) + Technical(0.15) + PolicyScore(0.15) + WebPresence(0.15)
 * - Verified Merchant: All 7 dimensions with Fulfillment(0.35) + DataQuality(0.25) dominant
 */
export interface ScoringEvidence {
  // ── Identity Dimension ──
  /** SEC-regulated public company */
  hasSecFiling: boolean;
  /** Has stock ticker symbol */
  hasStockSymbol: boolean;
  /** Stock exchange code (e.g., "NYSE", "NASDAQ") */
  stockExchange: string | null;
  /** Has Wikidata QID */
  hasWikidataId: boolean;
  /** Corporate registry verified */
  hasCorporateRegistry: boolean;
  /** WHOIS data consistent */
  hasWhoisData: boolean;
  /** Parent company on record */
  hasParentCompany: boolean;
  /** Has founded year */
  hasFoundedYear: boolean;
  /** Company age in years */
  companyAge: number | null;
  /** Has headquarters data */
  hasHeadquarters: boolean;
  /** Tranco popularity rank */
  trancoRank: number | null;
  /** Business category */
  category: string | null;

  // ── Technical Dimension ──
  /** SSL certificate type */
  sslType: "EV" | "OV" | "DV" | null;
  /** DMARC policy */
  dmarcPolicy: "reject" | "quarantine" | "none" | null;
  /** Has SPF record */
  hasSpf: boolean;
  /** Has DKIM record */
  hasDkim: boolean;
  /** HSTS enabled */
  hasHsts: boolean;
  /** Has CAA record */
  hasCaa: boolean;
  /** Has security.txt (RFC 9116) */
  hasSecurityTxt: boolean;
  /** Has MTA-STS policy */
  hasMtaSts: boolean;

  // ── Compliance Dimension ──
  /** Compliance verification status */
  complianceStatus: "VERIFIED" | "PARTIAL" | "PENDING";
  /** Compliance evidence text */
  complianceEvidence: string;
  /** Compliance score (0-100) */
  complianceScore: number;

  // ── PolicyScore Dimension ──
  /** Privacy policy page exists */
  hasPrivacyPolicy: boolean;
  /** Privacy policy contains GDPR provisions */
  privacyHasGdpr: boolean;
  /** Privacy policy contains CCPA provisions */
  privacyHasCcpa: boolean;
  /** Refund/return policy page exists */
  hasRefundPolicy: boolean;
  /** Return window days (parsed from policy page) */
  policyReturnWindowDays: number | null;
  /** Terms of service page exists */
  hasTermsOfService: boolean;
  /** Cookie consent mechanism exists */
  hasCookieConsent: boolean;

  // ── WebPresence Dimension ──
  /** robots.txt exists and well-formed */
  hasRobotsTxt: boolean;
  /** robots.txt allows major search engines */
  robotsAllowsCrawlers: boolean;
  /** sitemap.xml exists */
  hasSitemap: boolean;
  /** Schema.org JSON-LD structured data */
  hasSchemaOrg: boolean;
  /** Organization schema complete (name+url+logo) */
  hasOrgSchemaComplete: boolean;
  /** Multi-language support (hreflang) */
  hasMultiLang: boolean;
  /** AI crawler friendly (allows GPTBot/ClaudeBot/PerplexityBot) */
  aiCrawlerFriendly: boolean;
  /** Has llms.txt file */
  hasLlmsTxt: boolean;
  /** Has public API endpoints declared in llms.txt */
  hasPublicApi: boolean;

  // ── DataQuality Dimension (Product Page Sampling) ──
  // Sub-dim 1: Complete Product Catalog (max 25)
  /** Has JSON-LD or Microdata Product schema (≥2/3 sampled pages) */
  hasProductSchema: boolean;
  /** Product has name+description+image (≥2/3 sampled pages) */
  productHasBasicFields: boolean;
  /** Sitemap contains product URLs */
  hasProductSitemap: boolean;
  /** Product URL count in sitemap */
  productUrlCount: number;
  /** Template/placeholder detection (price=0, identical descriptions) */
  isPlaceholder: boolean;

  // Sub-dim 2: Accurate Pricing (max 30)
  /** Has Offer/AggregateOffer data */
  hasPriceData: boolean;
  /** priceCurrency field present */
  priceHasCurrency: boolean;
  /** availability field present */
  hasAvailability: boolean;

  // Sub-dim 3: Inventory Freshness (max 15)
  /** Sitemap lastmod within 30 days */
  sitemapLastmodRecent: boolean;
  /** Multiple availability statuses (InStock + OutOfStock) */
  hasVariedAvailability: boolean;

  // Sub-dim 4: Rich Media (max 10)
  /** Product images have alt text */
  productImagesHaveAlt: boolean;
  /** Product image count */
  productImageCount: number;

  // Sub-dim 5: Schema.org Product Completeness (max 20)
  /** Has brand information */
  productHasBrand: boolean;
  /** Has ratings/reviews */
  productHasReview: boolean;
  /** Has SKU/GTIN/MPN identifiers */
  productHasIdentifier: boolean;
  /** Structured data detection method */
  structuredDataMethod: "json-ld" | "microdata" | "none";
  /** Number of sampled product pages */
  productSampleCount: number;

  // ── Fulfillment Dimension (requires Verified Merchant API) ──
  /** Has shipping policy (via merchant API) */
  hasShippingPolicy: boolean;
  /** Has return policy (via merchant API) */
  hasReturnPolicy: boolean;
  /** Average delivery days (via merchant API) */
  avgDeliveryDays: number | null;
  /** Return window days (via merchant API) */
  returnWindowDays: number | null;
  /** Has order tracking (via merchant API) */
  hasOrderTracking: boolean;
}

// ============================================================================
// Dimension Scores
// ============================================================================

/** Individual scores for all 7 trust dimensions */
export interface TrustDimensions {
  /** Identity credibility score (0-100) */
  identity: number;
  /** Technical security score (0-100) */
  technical: number;
  /** Compliance certification score (0-100) */
  compliance: number;
  /** Policy completeness score (0-100) */
  policyScore: number;
  /** Web presence professionalism score (0-100) */
  webPresence: number;
  /** Data quality score (0-100) */
  dataQuality: number;
  /** Fulfillment capability score (0-100) */
  fulfillment: number;
}

// ============================================================================
// Scoring Weights
// ============================================================================

/** Weight configuration for composite score calculation */
export interface ScoringWeights {
  identity: number;
  technical: number;
  compliance: number;
  policyScore: number;
  webPresence: number;
  dataQuality: number;
  fulfillment: number;
}

// ============================================================================
// Anti-Gaming Detection
// ============================================================================

/** Anti-gaming detection result */
export interface AntiGamingResult {
  /** Overall severity assessment */
  severity: AntiGamingSeverity;
  /** Multiplier to apply to gameable dimensions (0.0-1.0) */
  multiplier: number;
  /** Detected gaming patterns */
  patterns: string[];
}

// ============================================================================
// Verification Data
// ============================================================================

/** Single verification tier detail */
export interface TierDetail {
  /** Verification status */
  status: string;
  /** Evidence description */
  evidence: string;
  /** Data source identifier */
  source: string;
}

/** Verification data for all dimensions */
export interface VerificationData {
  tiers: {
    identity: TierDetail;
    technical?: TierDetail;
    compliance: TierDetail;
    policyScore?: TierDetail;
    webPresence?: TierDetail;
    dataQuality: TierDetail;
    fulfillment: TierDetail;
  };
}

// ============================================================================
// Score Result — Complete output of trust scoring
// ============================================================================

/** Complete trust score result */
export interface ScoreResult {
  /** Composite trust score (0-94, 95+ reserved for manual review) */
  trustScore: number;
  /** Trust badge level */
  badge: Badge;
  /** Trust tier */
  tier: Tier;
  /** Individual dimension scores */
  dimensions: TrustDimensions;
  /** Verification evidence data */
  verificationData: VerificationData;
  /** Data confidence label (does NOT affect score) */
  dataConfidence: DataConfidence;
  /** Anti-gaming assessment (if detected) */
  antiGaming?: AntiGamingResult;
}

// ============================================================================
// v3.1 Capabilities Layer — Non-scoring merchant capability output
// ============================================================================

/** Merchant e-commerce capabilities (NOT used in scoring — gameable signals) */
export interface MerchantCapabilities {
  /** Can an AI agent complete a purchase on this site? */
  canPurchase: boolean;
  /** Detected e-commerce platform (shopify/woocommerce/magento/bigcommerce/custom) */
  ecommercePlatform: string | null;
  /** Platform detection confidence (0-1) */
  ecommerceConfidence: number;
  /** Detected payment methods */
  paymentMethods: string[];
  /** Has live customer support (chat widget detected) */
  hasLiveSupport: boolean;
  /** Detected support channels (zendesk, email, phone, intercom, etc.) */
  supportChannels: string[];
  /** Social media platforms with active presence */
  socialPresence: string[];
  /** Physical business address detected */
  hasPhysicalAddress: boolean;
  /** Business email (non-gmail/yahoo/hotmail) detected */
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
  /** When data was last verified (ISO 8601) */
  lastVerifiedAt: string | null;
  /** Data age category: FRESH (<7d), AGING (7-30d), STALE (>30d) */
  dataAge: "FRESH" | "AGING" | "STALE";
  /** Scan engine version */
  scanVersion: number | null;
  /** Signal sources used (static-http, cloudflare-br, wikidata, sec, tranco) */
  signalSources: string[];
}

// ============================================================================
// Trust Manifest (trust.json) — Machine-readable trust declaration
// ============================================================================

/** OTR Trust Manifest — Published by merchants at /.well-known/otr/trust.json */
export interface TrustManifest {
  /** Schema version */
  version: string;
  /** Merchant domain */
  domain: string;
  /** Trust score at time of issuance */
  trustScore: number;
  /** Badge at time of issuance */
  badge: Badge;
  /** Dimension scores */
  dimensions: TrustDimensions;
  /** Issuance timestamp (ISO 8601) */
  issuedAt: string;
  /** Expiration timestamp (ISO 8601) */
  expiresAt: string;
  /** Issuer identifier */
  issuer: string;
}

/** Signed trust manifest with cryptographic signature */
export interface SignedTrustManifest {
  /** The manifest payload */
  manifest: TrustManifest;
  /** ECDSA P-256 signature (base64url) */
  signature: string;
  /** Public key identifier */
  keyId: string;
}
