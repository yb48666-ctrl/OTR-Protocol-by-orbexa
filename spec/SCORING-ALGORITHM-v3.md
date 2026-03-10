# OTR Scoring Algorithm v3.0

**Deterministic Trust Scoring Reference for AI Agent Commerce**

**Status:** Draft
**Version:** 3.0.0
**Date:** 2026-03-11
**Authors:** ORBEXA <dev@orbexa.io>
**License:** MIT

---

## Table of Contents

1. [Overview](#1-overview)
2. [Deterministic Scoring Guarantee](#2-deterministic-scoring-guarantee)
3. [Scoring Evidence (Inputs)](#3-scoring-evidence-inputs)
4. [Dimension Scoring Functions](#4-dimension-scoring-functions)
5. [Composite Score Calculation](#5-composite-score-calculation)
6. [Brand Fast-Track Bonus](#6-brand-fast-track-bonus)
7. [Anti-Gaming Adjustments](#7-anti-gaming-adjustments)
8. [Score Decay](#8-score-decay)
9. [Badge and Tier Assignment](#9-badge-and-tier-assignment)
10. [Data Confidence Label](#10-data-confidence-label)
11. [Test Vectors](#11-test-vectors)
12. [Scoring Fairness Guarantees](#12-scoring-fairness-guarantees)

---

## 1. Overview

The OTR scoring algorithm computes a composite trust score in the range [0, 94] from 7 independent dimensions. The algorithm is **strictly deterministic**: identical inputs MUST always produce identical outputs, regardless of the implementation, the computing environment, or the entity performing the computation.

This document serves as the definitive reference for implementing OTR trust scoring. All conformant implementations MUST produce outputs that match the test vectors defined in `conformance/test-vectors.json`.

### 1.1 Algorithm Summary

```
Input:  ScoringEvidence (structured set of boolean/numeric/string signals)
Output: ScoreResult {
          trustScore:      integer [0, 94]
          badge:           PLATINUM | GOLD | SILVER | BRONZE | UNRATED
          tier:            TIER_5 | TIER_4 | TIER_3 | TIER_2 | TIER_1
          dimensions:      { identity, technical, compliance, policyScore,
                            webPresence, dataQuality, fulfillment }  (each [0, 100])
          dataConfidence:  HIGH_CONFIDENCE | LOW_CONFIDENCE | INSUFFICIENT
          antiGaming?:     { severity, multiplier, patterns[] }
        }
```

### 1.2 Computation Steps

1. **Phase detection** — Determine Public Assessment or Verified Merchant based on evidence.
2. **Dimension scoring** — Compute all 7 dimension scores independently (each [0, 100]).
3. **Anti-gaming detection** — Check for gaming patterns; compute multiplier.
4. **Anti-gaming adjustment** — Apply multiplier to gameable dimensions if needed.
5. **Weighted composite** — Sum weighted dimension scores using phase-appropriate weights.
6. **Brand Fast-Track** — Add bonus points for qualifying brands.
7. **Cap and round** — Round to integer, cap at 94.
8. **Badge/Tier assignment** — Map composite score to badge and tier.
9. **Data confidence** — Assign confidence label (display-only, does NOT affect score).

## 2. Deterministic Scoring Guarantee

OTR scoring operates under a strict determinism contract:

```
INVARIANT: For all ScoringEvidence e1, e2:
  if e1 === e2 (structural equality), then
    calculateTrustScore(e1) === calculateTrustScore(e2) (structural equality)
```

This guarantee is foundational to the OTR protocol because:

- **Federation depends on it** — Multiple validators must produce identical scores from the same evidence.
- **Auditability requires it** — Any party must be able to reproduce a published score.
- **Anti-gaming relies on it** — Score manipulation detection requires consistent baselines.

**Implementation requirements for determinism:**

- No floating-point rounding ambiguity: all intermediate calculations use standard IEEE 754 double-precision arithmetic. Final rounding uses `Math.round()` (round half to even or round half up, depending on platform — the final `min(round(x), 94)` handles boundary cases).
- No external state or randomness.
- No side effects.
- No time-dependent computation (current timestamp MUST NOT affect score computation).

## 3. Scoring Evidence (Inputs)

The `ScoringEvidence` structure is the complete input to the scoring function. Every field maps directly to a verifiable data signal.

### 3.1 Identity Signals

| Field             | Type           | Description                                      |
|-------------------|----------------|--------------------------------------------------|
| hasSecFiling      | boolean        | SEC-regulated public company                     |
| hasStockSymbol    | boolean        | Has stock ticker symbol                          |
| stockExchange     | string \| null | Exchange code (e.g., "NYSE", "NASDAQ")           |
| hasWikidataId     | boolean        | Has Wikidata QID                                 |
| hasCorporateRegistry | boolean     | Corporate registry verified                      |
| hasWhoisData      | boolean        | WHOIS data consistent                            |
| hasParentCompany  | boolean        | Parent company on record                         |
| hasFoundedYear    | boolean        | Has founded year data                            |
| companyAge        | number \| null | Company age in years (decimal)                   |
| hasHeadquarters   | boolean        | Has headquarters data                            |
| trancoRank        | number \| null | Tranco popularity rank (1 = most popular)        |
| category          | string \| null | Business category                                |

### 3.2 Technical Signals

| Field            | Type                                   | Description                  |
|------------------|----------------------------------------|------------------------------|
| sslType          | "EV" \| "OV" \| "DV" \| null          | SSL certificate type         |
| dmarcPolicy      | "reject" \| "quarantine" \| "none" \| null | DMARC policy             |
| hasSpf           | boolean                                | SPF record present           |
| hasDkim          | boolean                                | DKIM record present          |
| hasHsts          | boolean                                | HSTS enabled                 |
| hasCaa           | boolean                                | CAA record present           |
| hasSecurityTxt   | boolean                                | security.txt (RFC 9116)      |
| hasMtaSts        | boolean                                | MTA-STS policy present       |

### 3.3 Compliance Signals

| Field               | Type                                | Description                |
|---------------------|-------------------------------------|----------------------------|
| complianceStatus    | "VERIFIED" \| "PARTIAL" \| "PENDING" | Compliance verification status |
| complianceEvidence  | string                              | Compliance evidence text   |
| complianceScore     | number                              | Pre-computed score (0-100) |

### 3.4 PolicyScore Signals

| Field                  | Type           | Description                         |
|------------------------|----------------|-------------------------------------|
| hasPrivacyPolicy       | boolean        | Privacy policy page exists          |
| privacyHasGdpr         | boolean        | Privacy policy contains GDPR provisions |
| privacyHasCcpa         | boolean        | Privacy policy contains CCPA provisions |
| hasRefundPolicy        | boolean        | Refund/return policy page exists    |
| policyReturnWindowDays | number \| null | Return window days (from policy)    |
| hasTermsOfService      | boolean        | Terms of service page exists        |
| hasCookieConsent       | boolean        | Cookie consent mechanism exists     |

### 3.5 WebPresence Signals

| Field                | Type    | Description                                  |
|----------------------|---------|----------------------------------------------|
| hasRobotsTxt         | boolean | robots.txt exists and well-formed            |
| robotsAllowsCrawlers | boolean | robots.txt allows major search engines       |
| hasSitemap           | boolean | sitemap.xml exists                           |
| hasSchemaOrg         | boolean | Schema.org JSON-LD structured data present   |
| hasOrgSchemaComplete | boolean | Organization schema complete (name+url+logo) |
| hasMultiLang         | boolean | Multi-language support (hreflang)            |
| hasViewport          | boolean | Mobile viewport meta tag                     |
| hasFavicon           | boolean | Favicon present                              |
| pageHasContent       | boolean | Page loads with real content                 |

### 3.6 DataQuality Signals (Verified Merchant API)

| Field              | Type    | Description                        |
|--------------------|---------|------------------------------------|
| hasProductCatalog  | boolean | Has product catalog                |
| hasPricingData     | boolean | Has pricing data                   |
| hasInventorySync   | boolean | Has inventory sync                 |
| hasRichMedia       | boolean | Has rich media (images, videos)    |
| hasStructuredData  | boolean | Has structured product data        |

### 3.7 Fulfillment Signals (Verified Merchant API)

| Field             | Type           | Description                          |
|-------------------|----------------|--------------------------------------|
| hasShippingPolicy | boolean        | Has shipping policy (API-provided)   |
| hasReturnPolicy   | boolean        | Has return policy (API-provided)     |
| avgDeliveryDays   | number \| null | Average delivery days (API-provided) |
| returnWindowDays  | number \| null | Return window days (API-provided)    |
| hasOrderTracking  | boolean        | Has order tracking (API-provided)    |

## 4. Dimension Scoring Functions

Each dimension scoring function takes a `ScoringEvidence` input and produces an integer score in the range [0, 100]. Scores are clamped: `score = clamp(rawScore, 0, 100)`.

### 4.1 Identity Scoring (0-100)

Identity measures unforgeable brand identity signals. Maximum possible raw score: 100.

| Signal                      | Points | Condition                                   | Exclusive? |
|-----------------------------|--------|---------------------------------------------|-----------|
| SEC Filing (US Exchange)    | +20    | `stockExchange` is NYSE, NASDAQ, or NYSE ARCA | Yes (vs. Non-US) |
| Non-US Stock Exchange       | +15    | `hasStockSymbol` is true, not US exchange    | Yes (vs. SEC) |
| Wikidata Entity             | +15    | `hasWikidataId` is true                      | No        |
| Company Age >= 10 years     | +10    | `companyAge >= 10`                           | Yes (vs. < 10yr) |
| Company Age < 10 years      | +5     | `hasFoundedYear` is true AND `companyAge < 10` | Yes (vs. >= 10yr) |
| Headquarters Data           | +5     | `hasHeadquarters` is true                    | No        |
| Parent Company              | +10    | `hasParentCompany` is true                   | No        |
| Tranco Rank <= 1,000        | +15    | `trancoRank <= 1000`                         | Yes (one tier) |
| Tranco Rank <= 5,000        | +12    | `trancoRank <= 5000`                         | Yes       |
| Tranco Rank <= 10,000       | +10    | `trancoRank <= 10000`                        | Yes       |
| Tranco Rank <= 50,000       | +7     | `trancoRank <= 50000`                        | Yes       |
| Tranco Rank <= 100,000      | +5     | `trancoRank <= 100000`                       | Yes       |
| Tranco Rank <= 500,000      | +3     | `trancoRank <= 500000`                       | Yes       |
| Tranco Rank <= 1,000,000    | +2     | `trancoRank <= 1000000`                      | Yes       |

**Exclusive signals:** For stock exchange, only the highest qualifying tier applies (SEC filing OR Non-US, not both). For company age, only one tier applies. For Tranco rank, only the highest qualifying tier applies.

**Pseudocode:**
```
function scoreIdentity(evidence):
    score = 0

    // Stock exchange (exclusive tiers)
    if evidence.stockExchange in ["NYSE", "NASDAQ", "NYSEARCA", "NYSE ARCA", "NYSE American"]:
        score += 20
    else if evidence.hasStockSymbol:
        score += 15

    // Wikidata
    if evidence.hasWikidataId: score += 15

    // Company age (exclusive tiers)
    if evidence.companyAge != null:
        if evidence.companyAge >= 10: score += 10
        else if evidence.hasFoundedYear: score += 5

    // Headquarters
    if evidence.hasHeadquarters: score += 5

    // Parent company
    if evidence.hasParentCompany: score += 10

    // Tranco rank (exclusive tiers, first match wins)
    if evidence.trancoRank != null:
        for tier in TRANCO_TIERS:
            if evidence.trancoRank <= tier.maxRank:
                score += tier.points
                break

    return clamp(score, 0, 100)
```

**Example calculations:**

| Merchant Type                    | Stock | Wikidata | Age   | HQ  | Parent | Tranco   | Score |
|----------------------------------|-------|----------|-------|-----|--------|----------|-------|
| Major US retailer (e.g., Amazon) | +20   | +15      | +10   | +5  | +0     | +15 (1K) | 65    |
| EU mid-size brand                | +15   | +15      | +10   | +5  | +10    | +10 (10K)| 65    |
| Young startup (< 1yr)           | +0    | +0       | +5    | +5  | +0     | +0       | 10    |
| Unknown domain                   | +0    | +0       | +0    | +0  | +0     | +0       | 0     |

### 4.2 Technical Scoring (0-100)

Technical measures DNS and SSL security configuration. Maximum possible raw score: 110 (clamped to 100).

| Signal           | Points | Condition                              | Exclusive? |
|------------------|--------|----------------------------------------|-----------|
| EV SSL           | +25    | `sslType === "EV"`                     | Yes (vs. OV/DV) |
| OV/DV SSL        | +15    | `sslType === "OV"` or `sslType === "DV"` | Yes (vs. EV) |
| DMARC reject     | +20    | `dmarcPolicy === "reject"`             | Yes (vs. quarantine) |
| DMARC quarantine | +15    | `dmarcPolicy === "quarantine"`         | Yes (vs. reject) |
| SPF Record       | +15    | `hasSpf` is true                       | No        |
| DKIM Record      | +10    | `hasDkim` is true                      | No        |
| HSTS             | +10    | `hasHsts` is true                      | No        |
| CAA Record       | +5     | `hasCaa` is true                       | No        |
| security.txt     | +5     | `hasSecurityTxt` is true               | No        |
| MTA-STS          | +5     | `hasMtaSts` is true                    | No        |

**Pseudocode:**
```
function scoreTechnical(evidence):
    score = 0

    if evidence.sslType == "EV": score += 25
    else if evidence.sslType in ["OV", "DV"]: score += 15

    if evidence.dmarcPolicy == "reject": score += 20
    else if evidence.dmarcPolicy == "quarantine": score += 15

    if evidence.hasSpf: score += 15
    if evidence.hasDkim: score += 10
    if evidence.hasHsts: score += 10
    if evidence.hasCaa: score += 5
    if evidence.hasSecurityTxt: score += 5
    if evidence.hasMtaSts: score += 5

    return clamp(score, 0, 100)
```

### 4.3 Compliance Scoring (0-100)

Compliance uses a status-based model with optional pre-computed score override.

| Status / Condition                   | Score | Condition                                    |
|--------------------------------------|-------|----------------------------------------------|
| Pre-computed score                   | value | `complianceScore > 0` — use directly         |
| VERIFIED                             | 85    | `complianceStatus === "VERIFIED"`            |
| PARTIAL                              | 72    | `complianceStatus === "PARTIAL"`             |
| INFERRED (high-compliance industry)  | 50    | `category` is in high-compliance industries  |
| PENDING                              | 0     | Default / no compliance data                 |

**High-compliance industries:** Financial Services, Banking, Insurance, Healthcare, Pharmaceuticals, Food & Beverage, Telecommunications, Education, Government, Energy.

**Pseudocode:**
```
function scoreCompliance(evidence):
    if evidence.complianceScore > 0:
        return clamp(evidence.complianceScore, 0, 100)

    if evidence.complianceStatus == "VERIFIED": return 85
    if evidence.complianceStatus == "PARTIAL": return 72

    if evidence.category in HIGH_COMPLIANCE_INDUSTRIES: return 50

    return 0
```

### 4.4 PolicyScore Scoring (0-100)

PolicyScore measures consumer policy completeness via website scanning. Maximum possible raw score: 90.

| Signal              | Points | Condition                                        |
|---------------------|--------|--------------------------------------------------|
| Privacy Policy      | +20    | `hasPrivacyPolicy` is true                       |
| GDPR Provisions     | +10    | `privacyHasGdpr` is true                         |
| CCPA Provisions     | +10    | `privacyHasCcpa` is true                         |
| Refund Policy       | +20    | `hasRefundPolicy` is true                        |
| Return >= 30 days   | +5     | `policyReturnWindowDays != null && >= 30`        |
| Terms of Service    | +15    | `hasTermsOfService` is true                      |
| Cookie Consent      | +10    | `hasCookieConsent` is true                       |

**Pseudocode:**
```
function scorePolicyScore(evidence):
    score = 0

    if evidence.hasPrivacyPolicy: score += 20
    if evidence.privacyHasGdpr: score += 10
    if evidence.privacyHasCcpa: score += 10
    if evidence.hasRefundPolicy: score += 20
    if evidence.policyReturnWindowDays != null AND evidence.policyReturnWindowDays >= 30:
        score += 5
    if evidence.hasTermsOfService: score += 15
    if evidence.hasCookieConsent: score += 10

    return clamp(score, 0, 100)
```

### 4.5 WebPresence Scoring (0-100)

WebPresence measures website professionalism and AI discoverability. Maximum possible raw score: 85 (current) / 100 (with future AI crawler signals).

| Signal              | Points | Condition                                        |
|---------------------|--------|--------------------------------------------------|
| robots.txt          | +10    | `hasRobotsTxt` is true                           |
| Crawler-Allowed     | +5     | `robotsAllowsCrawlers` is true                   |
| sitemap.xml         | +10    | `hasSitemap` is true                             |
| Schema.org JSON-LD  | +15    | `hasSchemaOrg` is true                           |
| Organization Schema | +10    | `hasOrgSchemaComplete` is true (name+url+logo)   |
| Multi-Language      | +5     | `hasMultiLang` is true (hreflang tags)           |
| Viewport Meta       | +5     | `hasViewport` is true                            |
| Favicon             | +5     | `hasFavicon` is true                             |
| Page Content        | +20    | `pageHasContent` is true                         |
| AI Crawler Friendly | +10    | *(Future: allows AI crawlers in robots.txt)*     |
| llms.txt            | +5     | *(Future: llms.txt file present)*                |

**Pseudocode:**
```
function scoreWebPresence(evidence):
    score = 0

    if evidence.hasRobotsTxt: score += 10
    if evidence.robotsAllowsCrawlers: score += 5
    if evidence.hasSitemap: score += 10
    if evidence.hasSchemaOrg: score += 15
    if evidence.hasOrgSchemaComplete: score += 10
    if evidence.hasMultiLang: score += 5
    if evidence.hasViewport: score += 5
    if evidence.hasFavicon: score += 5
    if evidence.pageHasContent: score += 20

    return clamp(score, 0, 100)
```

### 4.6 DataQuality Scoring (0-100)

DataQuality measures product catalog data completeness and accuracy. This dimension requires Verified Merchant API integration. Maximum possible raw score: 100.

| Signal           | Points | Condition                                |
|------------------|--------|------------------------------------------|
| Product Catalog  | +30    | `hasProductCatalog` is true              |
| Pricing Data     | +25    | `hasPricingData` is true                 |
| Inventory Sync   | +20    | `hasInventorySync` is true               |
| Rich Media       | +15    | `hasRichMedia` is true                   |
| Structured Data  | +10    | `hasStructuredData` is true              |

**Pseudocode:**
```
function scoreDataQuality(evidence):
    score = 0

    if evidence.hasProductCatalog: score += 30
    if evidence.hasPricingData: score += 25
    if evidence.hasInventorySync: score += 20
    if evidence.hasRichMedia: score += 15
    if evidence.hasStructuredData: score += 10

    return clamp(score, 0, 100)
```

### 4.7 Fulfillment Scoring (0-100)

Fulfillment measures real-world order fulfillment capability. This dimension requires Verified Merchant API integration. Maximum possible raw score: 100.

| Signal            | Points | Condition                                        |
|-------------------|--------|--------------------------------------------------|
| Shipping Policy   | +15    | `hasShippingPolicy` is true                      |
| Return Policy     | +15    | `hasReturnPolicy` is true                        |
| Order Tracking    | +20    | `hasOrderTracking` is true                       |
| Avg Delivery <= 5d| +15    | `avgDeliveryDays != null && avgDeliveryDays <= 5`|
| Return >= 14 days | +10    | `returnWindowDays != null && >= 14`              |
| Tracking Rate >= 90% | +15 | Tracking number validation rate >= 90%           |
| Low Complaint Rate| +10    | Customer complaint rate below threshold          |

> **Note:** The current reference implementation uses a simplified Fulfillment scoring model with `hasShippingPolicy (+25)`, `hasReturnPolicy (+25)`, `avgDeliveryDays < 5 (+20)`, `returnWindowDays >= 30 (+15)`, `hasOrderTracking (+15)`. The extended model above is the v3.0 target. Conformance test vectors are aligned to the reference implementation.

**Pseudocode (reference implementation):**
```
function scoreFulfillment(evidence):
    score = 0

    if evidence.hasShippingPolicy: score += 25
    if evidence.hasReturnPolicy: score += 25
    if evidence.avgDeliveryDays != null AND evidence.avgDeliveryDays < 5: score += 20
    if evidence.returnWindowDays != null AND evidence.returnWindowDays >= 30: score += 15
    if evidence.hasOrderTracking: score += 15

    return clamp(score, 0, 100)
```

## 5. Composite Score Calculation

### 5.1 Phase Detection

The scoring phase is automatically detected based on the presence of DataQuality or Fulfillment evidence:

```
function hasMerchantData(evidence):
    return evidence.hasProductCatalog
        OR evidence.hasPricingData
        OR evidence.hasInventorySync
        OR evidence.hasRichMedia
        OR evidence.hasStructuredData
        OR evidence.hasShippingPolicy
        OR evidence.hasReturnPolicy
        OR evidence.hasOrderTracking
        OR evidence.avgDeliveryDays IS NOT NULL
        OR evidence.returnWindowDays IS NOT NULL
```

### 5.2 Weight Tables

**Public Assessment Weights:**

| Dimension   | Weight | Sum Check |
|-------------|--------|-----------|
| Identity    | 0.55   |           |
| Technical   | 0.15   |           |
| Compliance  | 0.00   |           |
| PolicyScore | 0.15   |           |
| WebPresence | 0.15   |           |
| DataQuality | 0.00   |           |
| Fulfillment | 0.00   |           |
| **Total**   | **1.00** |         |

**Verified Merchant Weights:**

| Dimension   | Weight | Sum Check |
|-------------|--------|-----------|
| Identity    | 0.15   |           |
| Technical   | 0.05   |           |
| Compliance  | 0.10   |           |
| PolicyScore | 0.05   |           |
| WebPresence | 0.05   |           |
| DataQuality | 0.25   |           |
| Fulfillment | 0.35   |           |
| **Total**   | **1.00** |         |

### 5.3 Composite Formula

```
rawComposite = identity × w.identity
             + technical × w.technical
             + compliance × w.compliance
             + policyScore × w.policyScore
             + webPresence × w.webPresence
             + dataQuality × w.dataQuality
             + fulfillment × w.fulfillment

fastTrackBonus = calculateFastTrackBonus(evidence)

trustScore = min(round(rawComposite + fastTrackBonus), 94)
```

**Important:** All 7 dimension scores are always computed, regardless of the active weights. Dimensions with weight 0.00 simply do not contribute to the composite but are still reported in the output.

## 6. Brand Fast-Track Bonus

Major brands with independently verifiable signals receive a bonus added to the composite score before capping.

### 6.1 Qualification Criteria

| Condition                                         | Bonus |
|--------------------------------------------------|-------|
| Stock-listed + Tranco Top 1K + Wikidata entity   | +15   |
| Stock-listed + Tranco Top 1K (no Wikidata)       | +10   |
| Stock-listed only                                | +10   |
| Tranco Top 1K only                              | +8    |

### 6.2 Rules

1. Only the **highest qualifying bonus** applies (bonuses are NOT cumulative).
2. The bonus is added **after** weighted composite calculation.
3. The final score is still subject to the **94-point cap**.
4. `isStockListed = evidence.hasStockSymbol`
5. `isTop1K = evidence.trancoRank != null AND evidence.trancoRank <= 1000`
6. `hasWikidata = evidence.hasWikidataId`

**Pseudocode:**
```
function calculateFastTrackBonus(evidence):
    isListed = evidence.hasStockSymbol
    isTop1K  = evidence.trancoRank != null AND evidence.trancoRank <= 1000
    hasWiki  = evidence.hasWikidataId

    if isListed AND isTop1K AND hasWiki: return 15
    if isListed AND isTop1K:             return 10
    if isListed:                         return 10
    if isTop1K:                          return 8
    return 0
```

## 7. Anti-Gaming Adjustments

When gaming patterns are detected, gameable dimension scores are reduced by a multiplier before composite calculation. See [Anti-Fraud Framework](./ANTI-FRAUD-FRAMEWORK.md) for the full detection engine specification.

### 7.1 Gameable vs. Ungameable Dimensions

| Dimension   | Gameable? | Anti-Gaming Applied? |
|-------------|-----------|---------------------|
| Identity    | No        | Never               |
| Technical   | Yes       | Multiplier applied  |
| Compliance  | No        | Never               |
| PolicyScore | Yes       | Multiplier applied  |
| WebPresence | Yes       | Multiplier applied  |
| DataQuality | No        | Never               |
| Fulfillment | No        | Never               |

### 7.2 Multiplier Application

```
function applyAntiGamingMultiplier(dimensions, multiplier):
    if multiplier >= 1.0: return dimensions  // No adjustment needed

    return {
        identity:    dimensions.identity,       // Never penalized
        technical:   round(dimensions.technical × multiplier),
        compliance:  dimensions.compliance,      // Never penalized
        policyScore: round(dimensions.policyScore × multiplier),
        webPresence: round(dimensions.webPresence × multiplier),
        dataQuality: dimensions.dataQuality,     // Never penalized
        fulfillment: dimensions.fulfillment      // Never penalized
    }
```

### 7.3 Detection Patterns

| Pattern                  | Multiplier | Trigger Condition                                       |
|--------------------------|-----------|----------------------------------------------------------|
| Signal-Brand Mismatch    | ×0.5      | tech >= 80, no established identity, young/unknown domain |
| Domain Age < 6 months    | ×0.5      | `companyAge < 0.5`                                       |
| Domain Age < 1 year      | ×0.75     | `companyAge < 1.0`                                       |
| Perfect Gameable / Time Clustering | ×0.7 | All 3 gameable dims >= 90, identity < 30            |

When multiple patterns are detected, the **lowest** (most severe) multiplier is applied.

### 7.4 Severity Classification

| Severity       | Multiplier Range | Meaning                             |
|----------------|-----------------|-------------------------------------|
| CLEAN          | 1.0             | No gaming detected                  |
| SUSPICIOUS     | (0.5, 1.0)      | Possible gaming; scores adjusted    |
| LIKELY_GAMING  | <= 0.5          | Strong gaming indicators            |

## 8. Score Decay

Trust scores decay over time if the underlying merchant data is not refreshed. Decay is applied as a post-processing step on the stored trust score.

### 8.1 Decay Schedule

| Data Age (days since last verification) | Decay Factor | Effect                  |
|-----------------------------------------|-------------|-------------------------|
| 0 - 7                                  | 1.00        | No decay                |
| 8 - 30                                 | 0.95        | 5% reduction            |
| 31 - 90                                | 0.85        | 15% reduction           |
| 91+                                    | 0.65        | 35% reduction           |

### 8.2 Decay Application

```
function applyScoreDecay(trustScore, daysSinceVerification):
    for interval in DECAY_INTERVALS (sorted by maxDays ascending):
        if daysSinceVerification <= interval.maxDays:
            return round(trustScore × interval.factor)

    // Fallback: maximum decay
    return round(trustScore × 0.65)
```

### 8.3 Decay Examples

| Original Score | Badge    | After 30 days | After 90 days | After 180 days |
|---------------|----------|---------------|---------------|----------------|
| 92 (PLATINUM) | PLATINUM | 87 (GOLD)     | 78 (SILVER)   | 60 (BRONZE)    |
| 85 (GOLD)     | GOLD     | 81 (GOLD)     | 72 (SILVER)   | 55 (UNRATED)   |
| 72 (SILVER)   | SILVER   | 68 (BRONZE)   | 61 (BRONZE)   | 47 (UNRATED)   |
| 65 (BRONZE)   | BRONZE   | 62 (BRONZE)   | 55 (UNRATED)  | 42 (UNRATED)   |

## 9. Badge and Tier Assignment

### 9.1 Badge Thresholds

```
function assignBadge(trustScore):
    if trustScore >= 90: return "PLATINUM"
    if trustScore >= 80: return "GOLD"
    if trustScore >= 70: return "SILVER"
    if trustScore >= 60: return "BRONZE"
    return "UNRATED"
```

### 9.2 Tier Mapping

```
function assignTier(badge):
    switch badge:
        "PLATINUM" → "TIER_5"
        "GOLD"     → "TIER_4"
        "SILVER"   → "TIER_3"
        "BRONZE"   → "TIER_2"
        "UNRATED"  → "TIER_1"
```

## 10. Data Confidence Label

The data confidence label is a **display-only indicator** that does NOT affect scoring. It tells AI agents how much historical data backs the current score.

```
function determineDataConfidence(dataAgeMonths):
    if dataAgeMonths == null OR dataAgeMonths < 1: return "INSUFFICIENT"
    if dataAgeMonths < 3: return "LOW_CONFIDENCE"
    return "HIGH_CONFIDENCE"
```

| Label             | Months of Data | AI Agent Guidance                            |
|-------------------|---------------|----------------------------------------------|
| HIGH_CONFIDENCE   | >= 3          | Score is well-supported; safe to rely on      |
| LOW_CONFIDENCE    | 1-3           | Score is provisional; consider additional signals |
| INSUFFICIENT      | < 1           | Very limited data; treat with extra caution   |

## 11. Test Vectors

Conformant implementations MUST produce identical outputs for the standard test vectors. Below are representative examples.

### 11.1 Test Vector: Major US Brand (Public Assessment)

```json
{
  "id": "PA-001-major-us-brand",
  "description": "NYSE-listed, Tranco Top 1K, Wikidata, strong tech",
  "evidence": {
    "hasSecFiling": true,
    "hasStockSymbol": true,
    "stockExchange": "NYSE",
    "hasWikidataId": true,
    "hasCorporateRegistry": true,
    "hasWhoisData": true,
    "hasParentCompany": false,
    "hasFoundedYear": true,
    "companyAge": 50,
    "hasHeadquarters": true,
    "trancoRank": 500,
    "category": "Fashion & Apparel",
    "sslType": "EV",
    "dmarcPolicy": "reject",
    "hasSpf": true,
    "hasDkim": true,
    "hasHsts": true,
    "hasCaa": true,
    "hasSecurityTxt": true,
    "hasMtaSts": false,
    "complianceStatus": "PENDING",
    "complianceEvidence": "",
    "complianceScore": 0,
    "hasPrivacyPolicy": true,
    "privacyHasGdpr": true,
    "privacyHasCcpa": true,
    "hasRefundPolicy": true,
    "policyReturnWindowDays": 30,
    "hasTermsOfService": true,
    "hasCookieConsent": true,
    "hasRobotsTxt": true,
    "robotsAllowsCrawlers": true,
    "hasSitemap": true,
    "hasSchemaOrg": true,
    "hasOrgSchemaComplete": true,
    "hasMultiLang": true,
    "hasViewport": true,
    "hasFavicon": true,
    "pageHasContent": true,
    "hasProductCatalog": false,
    "hasPricingData": false,
    "hasInventorySync": false,
    "hasRichMedia": false,
    "hasStructuredData": false,
    "hasShippingPolicy": false,
    "hasReturnPolicy": false,
    "avgDeliveryDays": null,
    "returnWindowDays": null,
    "hasOrderTracking": false
  },
  "expectedPhase": "PUBLIC_ASSESSMENT",
  "expectedDimensions": {
    "identity": 65,
    "technical": 96,
    "compliance": 0,
    "policyScore": 90,
    "webPresence": 85,
    "dataQuality": 0,
    "fulfillment": 0
  },
  "expectedFastTrackBonus": 15,
  "expectedTrustScore": 91,
  "expectedBadge": "PLATINUM",
  "expectedTier": "TIER_5"
}
```

**Calculation walkthrough:**
```
Identity:    20 (NYSE) + 15 (Wikidata) + 10 (Age>=10) + 5 (HQ) + 15 (Tranco<=1K) = 65
Technical:   25 (EV) + 20 (DMARC reject) + 15 (SPF) + 10 (DKIM) + 10 (HSTS) + 5 (CAA) + 5 (security.txt) = 90 → clamped at 90
PolicyScore: 20 (Privacy) + 10 (GDPR) + 10 (CCPA) + 20 (Refund) + 5 (Return>=30d) + 15 (ToS) + 10 (Cookie) = 90
WebPresence: 10 (robots) + 5 (crawlers) + 10 (sitemap) + 15 (Schema.org) + 10 (Org) + 5 (multi-lang) + 5 (viewport) + 5 (favicon) + 20 (content) = 85
Phase: PUBLIC_ASSESSMENT (no merchant data)
Composite:   65×0.55 + 90×0.15 + 90×0.15 + 85×0.15 = 35.75 + 13.5 + 13.5 + 12.75 = 75.5
Fast-Track:  NYSE + Top1K + Wikidata → +15
Final:       min(round(75.5 + 15), 94) = min(91, 94) = 91
Badge:       PLATINUM (91 >= 90)
```

> **Note:** Full conformance test vectors are in `conformance/test-vectors.json`. The above is illustrative; actual test vectors are the normative reference.

### 11.2 Test Vector: Unknown Gaming Site (Public Assessment)

```json
{
  "id": "PA-002-gaming-site",
  "description": "No identity, perfect gameable scores — gaming detection",
  "evidence": {
    "hasSecFiling": false,
    "hasStockSymbol": false,
    "stockExchange": null,
    "hasWikidataId": false,
    "hasCorporateRegistry": false,
    "hasWhoisData": false,
    "hasParentCompany": false,
    "hasFoundedYear": true,
    "companyAge": 0.3,
    "hasHeadquarters": false,
    "trancoRank": null,
    "category": null,
    "sslType": "DV",
    "dmarcPolicy": "reject",
    "hasSpf": true,
    "hasDkim": true,
    "hasHsts": true,
    "hasCaa": true,
    "hasSecurityTxt": true,
    "hasMtaSts": true,
    "complianceStatus": "PENDING",
    "complianceEvidence": "",
    "complianceScore": 0,
    "hasPrivacyPolicy": true,
    "privacyHasGdpr": true,
    "privacyHasCcpa": true,
    "hasRefundPolicy": true,
    "policyReturnWindowDays": 30,
    "hasTermsOfService": true,
    "hasCookieConsent": true,
    "hasRobotsTxt": true,
    "robotsAllowsCrawlers": true,
    "hasSitemap": true,
    "hasSchemaOrg": true,
    "hasOrgSchemaComplete": true,
    "hasMultiLang": true,
    "hasViewport": true,
    "hasFavicon": true,
    "pageHasContent": true,
    "hasProductCatalog": false,
    "hasPricingData": false,
    "hasInventorySync": false,
    "hasRichMedia": false,
    "hasStructuredData": false,
    "hasShippingPolicy": false,
    "hasReturnPolicy": false,
    "avgDeliveryDays": null,
    "returnWindowDays": null,
    "hasOrderTracking": false
  }
}
```

**Before anti-gaming:**
```
Identity:    5 (age < 10 + hasFoundedYear) = 5
Technical:   15+20+15+10+10+5+5+5 = 85
PolicyScore: 20+10+10+20+5+15+10 = 90
WebPresence: 10+5+10+15+10+5+5+5+20 = 85
Composite:   5×0.55 + 85×0.15 + 90×0.15 + 85×0.15 = 2.75 + 12.75 + 13.5 + 12.75 = 41.75
```

**After anti-gaming (domain < 6 months, multiplier = 0.5):**
```
Technical:   round(85 × 0.5) = 43
PolicyScore: round(90 × 0.5) = 45
WebPresence: round(85 × 0.5) = 43
Composite:   5×0.55 + 43×0.15 + 45×0.15 + 43×0.15 = 2.75 + 6.45 + 6.75 + 6.45 = 22.4
Final:       min(round(22.4), 94) = 22
Badge:       UNRATED
```

## 12. Scoring Fairness Guarantees

The OTR scoring algorithm operates under the following fairness commitments:

1. **Purely behavior-data-driven** — Scores are based exclusively on verifiable data signals, not on subjective assessment or editorial judgment.

2. **Not linked to integration time** — A merchant that joined today with excellent data scores identically to a merchant with 12 months of the same data quality. Time on platform does NOT influence scoring.

3. **Cannot be purchased** — There is no mechanism to buy, influence, or negotiate a higher trust score through any commercial relationship.

4. **Fully open-source** — The scoring algorithm source code is published under the MIT license. Any party may audit, reproduce, and verify any trust score.

5. **No human override** — All scores are algorithmically computed. There is no manual adjustment, editorial override, or case-by-case exception mechanism.

6. **Deterministically reproducible** — Given the same `ScoringEvidence` input, any conformant implementation will produce the same output. The conformance test suite provides standard test vectors for verification.
