# OTR Protocol Specification v3.0

**Open Trust Registry — Merchant Trust Verification Protocol for AI Agent Commerce**

**Status:** Draft
**Version:** 3.0.0
**Date:** 2026-03-11
**Authors:** ORBEXA <dev@orbexa.io>
**License:** MIT

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Protocol Stack Position](#3-protocol-stack-position)
4. [Terminology](#4-terminology)
5. [Trust Score System](#5-trust-score-system)
6. [Seven Trust Dimensions](#6-seven-trust-dimensions)
7. [Assessment Phases](#7-assessment-phases)
8. [Brand Fast-Track](#8-brand-fast-track)
9. [Badge and Tier Assignment](#9-badge-and-tier-assignment)
10. [Anti-Gaming Detection](#10-anti-gaming-detection)
11. [Score Decay](#11-score-decay)
12. [Data Confidence Labels](#12-data-confidence-labels)
13. [Trust Manifest (trust.json)](#13-trust-manifest-trustjson)
14. [API Endpoints](#14-api-endpoints)
15. [MCP Server Integration](#15-mcp-server-integration)
16. [Recommendation Decision Logic](#16-recommendation-decision-logic)
17. [Data Source Requirements](#17-data-source-requirements)
18. [Federation Model](#18-federation-model)
19. [Scoring Independence and Fairness](#19-scoring-independence-and-fairness)
20. [Conformance](#20-conformance)
21. [Security Considerations](#21-security-considerations)
22. [References](#22-references)

---

## 1. Abstract

The Open Trust Registry (OTR) protocol defines a deterministic, open-source framework for assessing merchant trustworthiness in AI agent commerce. As AI agents increasingly make purchase decisions on behalf of consumers, they require a reliable, verifiable, and manipulation-resistant answer to one fundamental question: **"Is this merchant trustworthy enough to recommend?"**

OTR provides this answer through a 7-dimension trust scoring model that produces a composite trust score in the range of 0-94, derived entirely from objective, verifiable data. The protocol is designed to be deterministic: identical inputs MUST always produce identical outputs, regardless of the implementation or the entity performing the computation.

This specification defines the trust model, scoring phases, API surface, data formats, anti-gaming detection, federation model, and conformance requirements for OTR v3.

## 2. Introduction

### 2.1 Problem Statement

The emergence of AI agent commerce — where autonomous AI agents discover, evaluate, and purchase products on behalf of consumers — introduces a critical trust gap. Traditional e-commerce trust signals (brand recognition, visual design quality, word-of-mouth) are optimized for human cognition. AI agents lack the ability to evaluate these signals and require a structured, machine-readable trust framework.

Without such a framework, AI agents face several risks:

- **Recommending fraudulent merchants** that exist solely to collect payment without delivering goods
- **Overlooking legitimate merchants** that lack traditional visibility signals but provide excellent service
- **Falling victim to trust signal gaming**, where adversarial actors optimize easily-manipulated signals to appear trustworthy
- **Producing inconsistent recommendations** across different AI platforms, eroding consumer confidence

### 2.2 Design Goals

OTR v3 is designed around the following principles:

1. **Determinism** — The same scoring inputs MUST produce the same outputs across all implementations.
2. **Transparency** — The scoring algorithm is fully open-source under the MIT license. Any party MAY audit, reproduce, and verify any trust score.
3. **Anti-gaming resilience** — The scoring model weights unforgeable signals (SEC filings, Wikidata entities, Tranco rankings) over easily-manipulated signals (SSL certificates, policy pages).
4. **Behavioral verification** — For verified merchants, the dominant scoring factors are real-world fulfillment data and product data quality, not static website attributes.
5. **Federation readiness** — The protocol is designed for multi-validator consensus, inspired by Certificate Transparency and Tranco.
6. **No pay-for-trust** — Trust scores cannot be purchased, influenced, or manipulated through any commercial relationship.

### 2.3 Scope

This specification covers:

- The trust scoring model and its 7 dimensions
- Two assessment phases (Public Assessment and Verified Merchant)
- The trust.json manifest format for merchant self-publishing
- API endpoints for trust verification
- MCP (Model Context Protocol) server integration for AI agents
- Anti-gaming detection mechanisms
- Score decay and data confidence labels
- Federation model for multi-validator consensus
- Conformance testing requirements

This specification does NOT cover:

- The internal implementation of data collection crawlers
- Payment processing or transaction handling
- Agent identity verification (covered by Visa TAP)
- Product data exchange formats (covered by Google UCP)
- Payment orchestration (covered by Stripe ACP)

## 3. Protocol Stack Position

OTR occupies the **merchant trust layer** in the emerging agentic commerce protocol stack. It complements — but does not replace — the other layers:

```
┌────────────────────────────────────────────────────────────────────┐
│                       AI Agent Commerce Stack                      │
├────────────────┬────────────────┬────────────────┬────────────────┤
│   Visa TAP     │  Google UCP    │  Stripe ACP    │   OTR v3       │
│                │                │                │                │
│  Agent         │  Data          │  Payment       │  Merchant      │
│  Identity      │  Exchange      │  Processing    │  Trust         │
│                │                │                │                │
│  "Who is this  │  "What does    │  "How do we    │  "Is this      │
│   agent?"      │   the merchant │   process the  │   merchant     │
│                │   sell?"       │   payment?"    │   trustworthy?"│
├────────────────┴────────────────┴────────────────┴────────────────┤
│                    Consumer's AI Agent                             │
└───────────────────────────────────────────────────────────────────┘
```

**Protocol dependencies:**

| Protocol   | Provides                  | OTR Relationship                                 |
|-----------|---------------------------|--------------------------------------------------|
| Visa TAP  | Agent identity & auth     | OTR is agent-agnostic; any authenticated agent MAY query OTR |
| Google UCP| Product data exchange     | UCP data quality feeds OTR's DataQuality dimension |
| Stripe ACP| Payment orchestration     | ACP transaction history MAY feed OTR's Fulfillment dimension |
| OTR v3    | Merchant trust assessment | Independent trust layer; no dependency on other protocols |

## 4. Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

| Term | Definition |
|------|-----------|
| **Trust Score** | A composite numerical value (0-94) representing a merchant's overall trustworthiness. |
| **Dimension** | One of 7 independent scoring categories that contribute to the trust score. |
| **Badge** | A human-readable label (PLATINUM/GOLD/SILVER/BRONZE/UNRATED) derived from the trust score. |
| **Tier** | A machine-readable tier (TIER_5 through TIER_1) mapped from the badge. |
| **Public Assessment** | A trust assessment using only publicly verifiable data (4 dimensions). |
| **Verified Merchant** | A trust assessment that includes merchant-provided API data (7 dimensions). |
| **Scoring Evidence** | The complete set of input signals used to compute a trust score. |
| **Validator** | An entity that independently computes OTR trust scores from raw evidence. |
| **Trust Manifest** | A machine-readable JSON document published by merchants at `/.well-known/otr/trust.json`. |
| **Gameable Signal** | A scoring signal that can be trivially optimized by an adversarial actor (e.g., SSL certificates, policy pages). |
| **Unforgeable Signal** | A scoring signal that is difficult or impossible to fabricate (e.g., SEC filings, Tranco rank). |
| **Brand Fast-Track** | A bonus scoring mechanism for major, independently verifiable brands. |

## 5. Trust Score System

### 5.1 Score Range

Trust scores are integers in the range **[0, 94]**. Scores at or above 95 are reserved for future manual review processes and SHALL NOT be assigned by automated scoring.

```
TRUST_SCORE_AUTO_CAP = 94
```

### 5.2 Score Composition

The trust score is a weighted composite of individual dimension scores plus an optional Brand Fast-Track bonus:

```
composite = Σ(dimension_score × weight) + fast_track_bonus
trustScore = min(round(composite), 94)
```

Each dimension score is independently computed and normalized to the range [0, 100]. The weights applied depend on the assessment phase (see Section 7).

### 5.3 Determinism Guarantee

OTR scoring is **strictly deterministic**. Given identical `ScoringEvidence` inputs, any conformant implementation MUST produce:

- Identical dimension scores for all 7 dimensions
- An identical composite trust score
- An identical badge assignment
- An identical tier assignment

There is no randomness, no external state, and no side effects in the scoring computation. This property is critical for federation, where multiple independent validators must agree on scores.

## 6. Seven Trust Dimensions

OTR assesses merchant trustworthiness across 7 independent dimensions. Each dimension measures a distinct aspect of merchant reliability.

| # | Dimension       | Range  | Description                                                  | Forgeable? |
|---|-----------------|--------|--------------------------------------------------------------|-----------|
| 1 | **Identity**    | 0-100  | Corporate identity verification via unforgeable signals      | No        |
| 2 | **Technical**   | 0-100  | DNS, SSL, and email security configuration                   | Yes       |
| 3 | **Compliance**  | 0-100  | Regulatory and industry compliance status                    | No        |
| 4 | **PolicyScore** | 0-100  | Completeness and quality of consumer-facing policies         | Yes       |
| 5 | **WebPresence** | 0-100  | Website professionalism and AI discoverability               | Yes       |
| 6 | **DataQuality** | 0-100  | Product catalog data completeness and accuracy               | No        |
| 7 | **Fulfillment** | 0-100  | Real-world order fulfillment capability and track record     | No        |

### 6.1 Identity (Unforgeable)

The Identity dimension measures who the merchant is through signals that are difficult or impossible to fabricate. This is the most heavily weighted dimension in Public Assessment because it represents ground truth about the entity behind the domain.

**Signals assessed:**
- SEC filing status (NYSE, NASDAQ, NYSE ARCA — SEC-regulated exchanges)
- Non-US stock exchange listing
- Wikidata entity presence (QID)
- Company age (years since founding)
- Headquarters data availability
- Parent company affiliation
- Tranco domain popularity ranking (top 1M)

### 6.2 Technical (Gameable)

The Technical dimension measures DNS and SSL security configuration. While these signals indicate competence, they are categorized as **gameable** because any domain can implement them within hours.

**Signals assessed:**
- SSL certificate type (EV, OV, DV)
- DMARC policy (reject, quarantine, none)
- SPF record presence
- DKIM record presence
- HSTS (HTTP Strict Transport Security)
- CAA record (Certificate Authority Authorization)
- security.txt (RFC 9116)
- MTA-STS (Mail Transport Agent Strict Transport Security)

### 6.3 Compliance (Unforgeable)

The Compliance dimension measures regulatory and industry compliance. Scores are derived from audit results, status-based assessment, or industry inference for regulated sectors.

**Scoring model:**
- VERIFIED status (audit passed): 85 points
- PARTIAL status (partial evidence): 72 points
- INFERRED status (high-compliance industry baseline): 50 points
- PENDING status (no data): 0 points

If a pre-computed `complianceScore > 0` exists from an external compliance audit, it is used directly.

**High-compliance industries** (50-point baseline): Financial Services, Banking, Insurance, Healthcare, Pharmaceuticals, Food & Beverage, Telecommunications, Education, Government, Energy.

### 6.4 PolicyScore (Gameable)

The PolicyScore dimension measures the completeness and quality of consumer-facing policy pages, verified through real website scanning.

**Signals assessed:**
- Privacy policy page existence
- GDPR provisions in privacy policy
- CCPA provisions in privacy policy
- Refund/return policy page existence
- Return window (bonus for >= 30 days)
- Terms of service page existence
- Cookie consent mechanism

### 6.5 WebPresence (Gameable)

The WebPresence dimension measures website professionalism and AI discoverability. It evaluates whether the site is a real, maintained web presence or a hastily-constructed facade.

**Signals assessed:**
- robots.txt existence and validity
- Major crawler allowance
- sitemap.xml existence
- Schema.org JSON-LD structured data
- Organization schema completeness (name + url + logo)
- Multi-language support (hreflang tags)
- Viewport meta tag (mobile-friendliness)
- Favicon presence
- Real page content loading
- AI crawler friendliness (future: +10)
- llms.txt presence (future: +5)

### 6.6 DataQuality (Unforgeable, Requires API)

The DataQuality dimension measures the completeness and accuracy of product catalog data. This dimension is only available for Verified Merchants who provide data through the merchant API.

**Signals assessed:**
- Product catalog availability (+30)
- Pricing data accuracy (+25)
- Inventory freshness/sync (+20)
- Rich media (images, videos) (+15)
- Structured product data (+10)

### 6.7 Fulfillment (Unforgeable, Requires API)

The Fulfillment dimension measures real-world order fulfillment capability. This is the highest-weighted dimension for Verified Merchants because "Will they actually deliver?" is the #1 concern for AI agent purchase decisions.

**Signals assessed:**
- Shipping policy (API-provided)
- Return policy (API-provided)
- Average delivery time (bonus for < 5 days)
- Return window (bonus for >= 30 days)
- Order tracking availability

## 7. Assessment Phases

OTR operates in two assessment phases, determined automatically based on data availability.

### 7.1 Public Assessment (Cold Start)

Available for **any domain** using only publicly verifiable data. No merchant cooperation is required.

**Dimensions used:** Identity, Technical, PolicyScore, WebPresence (4 of 7)
**Dimensions excluded:** Compliance (weight 0.00), DataQuality (weight 0.00), Fulfillment (weight 0.00)

| Dimension   | Weight | Rationale                                              |
|-------------|--------|--------------------------------------------------------|
| Identity    | 0.55   | Unforgeable signals dominate; anti-gaming anchor       |
| Technical   | 0.15   | Easily optimized; lower weight prevents gaming         |
| PolicyScore | 0.15   | Easily optimized; lower weight prevents gaming         |
| WebPresence | 0.15   | Easily optimized; lower weight prevents gaming         |

**Formula:**
```
composite = identity × 0.55 + technical × 0.15 + policyScore × 0.15 + webPresence × 0.15
trustScore = min(round(composite + fastTrackBonus), 94)
```

**Design rationale:** Identity receives 55% of the weight because it contains signals that are practically impossible to fake (SEC filings, Wikidata entries, Tranco rankings). A gaming site with `identity=10, technical=100, policyScore=100, webPresence=100` scores only **50.5** (UNRATED), rather than the 68.5 (BRONZE) it would receive under equal weighting.

### 7.2 Verified Merchant (Authorized)

Available when a merchant provides data through the OTR merchant API. The system automatically detects Verified Merchant status when any DataQuality or Fulfillment evidence is present.

**Dimensions used:** All 7 dimensions

| Dimension   | Weight | Rationale                                              |
|-------------|--------|--------------------------------------------------------|
| Identity    | 0.15   | Already proven at enrollment; reduced weight           |
| Technical   | 0.05   | Baseline requirement; minimal weight                   |
| Compliance  | 0.10   | Regulatory adherence is important for verified merchants |
| PolicyScore | 0.05   | Baseline requirement; minimal weight                   |
| WebPresence | 0.05   | Baseline requirement; minimal weight                   |
| DataQuality | 0.25   | Product data quality is critical for AI agent decisions|
| Fulfillment | 0.35   | "Will they ship?" is the #1 AI agent concern           |

**Formula:**
```
composite = identity × 0.15 + technical × 0.05 + compliance × 0.10
          + policyScore × 0.05 + webPresence × 0.05
          + dataQuality × 0.25 + fulfillment × 0.35
trustScore = min(round(composite + fastTrackBonus), 94)
```

**Design rationale:** For verified merchants, behavioral signals (Fulfillment at 0.35, DataQuality at 0.25) account for 60% of the total weight. This ensures that trust is anchored to real-world performance — actual shipping, accurate inventory, and quality product data — rather than static website attributes.

### 7.3 Phase Detection

The assessment phase is determined automatically by inspecting the `ScoringEvidence` for any DataQuality or Fulfillment signals:

```
isVerifiedMerchant = hasProductCatalog OR hasPricingData OR hasInventorySync
                  OR hasRichMedia OR hasStructuredData OR hasShippingPolicy
                  OR hasReturnPolicy OR hasOrderTracking
                  OR avgDeliveryDays IS NOT NULL OR returnWindowDays IS NOT NULL
```

If `isVerifiedMerchant` is `true`, the Verified Merchant weights are applied. Otherwise, Public Assessment weights are used.

## 8. Brand Fast-Track

Major brands with independently verifiable signals receive a bonus added to the composite score before capping. The Brand Fast-Track system recognizes that certain signals in combination provide extremely strong trust evidence.

| Condition                                      | Bonus Points |
|------------------------------------------------|-------------|
| Stock-listed + Tranco Top 1K + Wikidata entity | +15         |
| Stock-listed + Tranco Top 1K (no Wikidata)     | +10         |
| Stock-listed only                              | +10         |
| Tranco Top 1K only                             | +8          |

**Rules:**
- The bonus is additive to the composite score.
- The final trust score is still subject to the 94-point cap.
- Only the highest qualifying bonus is applied (bonuses do not stack).
- Wikidata is required for the highest tier (+15) as a cross-validation signal ensuring the entity has sufficient public notability.

## 9. Badge and Tier Assignment

### 9.1 Badge Assignment

Badges provide a human-readable trust level derived from the composite trust score:

| Badge      | Score Range | Meaning                                          |
|------------|-------------|--------------------------------------------------|
| PLATINUM   | 90-94       | Highest verified trust; major established brand   |
| GOLD       | 80-89       | Strong trust; well-established merchant           |
| SILVER     | 70-79       | Good trust; credible merchant                     |
| BRONZE     | 60-69       | Acceptable trust; basic credibility established   |
| UNRATED    | 0-59        | Insufficient evidence for a trust recommendation  |

### 9.2 Tier Assignment

Tiers provide a machine-readable level for programmatic decision-making:

| Badge    | Tier   |
|----------|--------|
| PLATINUM | TIER_5 |
| GOLD     | TIER_4 |
| SILVER   | TIER_3 |
| BRONZE   | TIER_2 |
| UNRATED  | TIER_1 |

## 10. Anti-Gaming Detection

OTR includes an anti-gaming detection layer that identifies and penalizes adversarial optimization of gameable signals. See [Anti-Fraud Framework](./ANTI-FRAUD-FRAMEWORK.md) for the complete specification.

### 10.1 Detection Patterns

1. **Signal-Brand Mismatch:** Technical score >= 80 combined with no verifiable brand identity (no Wikidata, no stock listing, no Tranco rank < 100K) and a young or unknown domain age.
2. **Domain Age Gate:** Domains under 6 months have gameable dimension scores capped at 50. Domains under 1 year have gameable dimension scores capped at 75.
3. **Perfect Gameable Scores:** All three gameable dimensions (Technical, PolicyScore, WebPresence) score >= 90 while Identity scores < 30.

### 10.2 Multipliers

When gaming patterns are detected, a multiplier in the range [0.5, 0.7] is applied to gameable dimensions (Technical, PolicyScore, WebPresence) **before** composite score calculation. Identity, Compliance, DataQuality, and Fulfillment are **never** penalized by anti-gaming multipliers.

| Pattern                | Multiplier |
|------------------------|-----------|
| Signal-Brand Mismatch  | ×0.5      |
| Domain Age < 6 months  | ×0.5      |
| Domain Age < 1 year    | ×0.75     |
| Perfect Gameable Scores| ×0.7      |

### 10.3 Severity Levels

| Severity       | Condition           | Meaning                                   |
|----------------|---------------------|-------------------------------------------|
| CLEAN          | Multiplier = 1.0    | No gaming detected                        |
| SUSPICIOUS     | Multiplier < 1.0    | Possible gaming; scores adjusted           |
| LIKELY_GAMING  | Multiplier <= 0.5   | Strong gaming indicators; significant penalty |

## 11. Score Decay

Trust scores decay over time if the underlying merchant data is not refreshed. This prevents stale data from maintaining artificially high scores.

| Data Age       | Decay Factor | Effective Score              |
|----------------|-------------|------------------------------|
| <= 7 days      | 1.00        | Full score                   |
| <= 30 days     | 0.95        | 5% reduction                 |
| <= 90 days     | 0.85        | 15% reduction                |
| > 90 days      | 0.65        | 35% reduction                |

Score decay is applied as a post-processing step:

```
decayedScore = round(trustScore × decayFactor)
```

## 12. Data Confidence Labels

A display-only label that does **NOT** affect the trust score. It communicates to AI agents how much data supports the computed score.

| Label             | Condition           | Meaning                                    |
|-------------------|---------------------|--------------------------------------------|
| HIGH_CONFIDENCE   | >= 3 months of data | Score backed by substantial historical data|
| LOW_CONFIDENCE    | 1-3 months of data  | Limited historical data backing            |
| INSUFFICIENT      | < 1 month of data   | Very limited data; score may be volatile   |

## 13. Trust Manifest (trust.json)

Merchants MAY publish a trust manifest at:

```
https://{domain}/.well-known/otr/trust.json
```

### 13.1 Format

The trust manifest is a JSON document conforming to the [Trust Manifest JSON Schema](./TRUST-MANIFEST.schema.json).

```json
{
  "version": "3.0.0",
  "domain": "example.com",
  "trustScore": 85,
  "badge": "GOLD",
  "tier": "TIER_4",
  "assessmentType": "VERIFIED_MERCHANT",
  "dimensions": {
    "identity": 75,
    "technical": 80,
    "compliance": 72,
    "policyScore": 85,
    "webPresence": 70,
    "dataQuality": 90,
    "fulfillment": 95
  },
  "dataConfidence": "HIGH_CONFIDENCE",
  "issuedAt": "2026-03-01T00:00:00Z",
  "expiresAt": "2026-04-01T00:00:00Z",
  "issuer": "orbexa.io",
  "issuerKeyId": "orbexa-2026-03"
}
```

### 13.2 Signed Manifests

Manifests MAY be cryptographically signed using ECDSA P-256 to allow independent verification:

```json
{
  "manifest": {
    "version": "3.0.0",
    "domain": "example.com",
    "trustScore": 85,
    "badge": "GOLD",
    "...": "..."
  },
  "signature": "<base64url-encoded ECDSA P-256 signature>",
  "keyId": "orbexa-2026-03"
}
```

**Verification process:**
1. Retrieve the issuer's public key using the `keyId`.
2. Compute the SHA-256 hash of the canonical JSON serialization of the `manifest` object.
3. Verify the ECDSA P-256 `signature` against the hash using the public key.
4. Confirm the `expiresAt` timestamp has not passed.

### 13.3 Manifest Caching

- Manifests SHOULD have an `expiresAt` no more than 30 days from `issuedAt`.
- Consumers SHOULD re-fetch manifests when `expiresAt` is within 24 hours.
- Consumers MUST NOT use manifests with expired `expiresAt` timestamps.
- Consumers SHOULD validate signed manifests against the issuer's published public key.

## 14. API Endpoints

### 14.1 Verify Merchant

```
GET /api/otr/verify/{domain}
```

Returns the complete trust assessment for a domain.

**Response (200 OK):**

```json
{
  "domain": "nike.com",
  "name": "Nike, Inc.",
  "trustScore": 91,
  "trustTier": "TIER_5",
  "badge": "PLATINUM",
  "category": "Fashion & Apparel",
  "verificationData": {
    "tiers": {
      "identity": {
        "source": "sec.gov",
        "status": "VERIFIED",
        "evidence": "Stock: NYSE, Wikidata verified, Corporate registry verified"
      },
      "technical": {
        "source": "dns-scan",
        "status": "VERIFIED",
        "evidence": "EV-SSL, DMARC-reject, SPF, DKIM, HSTS"
      },
      "compliance": {
        "source": "compliance-audit",
        "status": "VERIFIED",
        "evidence": "SOC 2 Type II audit passed"
      },
      "policyScore": {
        "source": "web-scan",
        "status": "VERIFIED",
        "evidence": "Privacy-policy, Refund-policy, Terms-of-service, Cookie-consent"
      },
      "webPresence": {
        "source": "web-scan",
        "status": "VERIFIED",
        "evidence": "Schema.org, sitemap, robots.txt, multi-lang"
      },
      "dataQuality": {
        "source": "merchant-api",
        "status": "VERIFIED",
        "evidence": "Full product catalog with rich media"
      },
      "fulfillment": {
        "source": "merchant-api",
        "status": "VERIFIED",
        "evidence": "Order tracking, avg delivery 3.2 days"
      }
    },
    "scanMetadata": {
      "scanner": "otr-scanner/3.0",
      "lastScanAt": "2026-03-10T12:00:00Z",
      "scanVersion": 3
    },
    "schema_version": "3.0.0"
  },
  "trustDimensions": {
    "identity": 90,
    "technical": 85,
    "compliance": 85,
    "policyScore": 80,
    "webPresence": 75,
    "dataQuality": 95,
    "fulfillment": 100
  },
  "entityData": {
    "stockSymbol": "NKE",
    "stockExchange": "NYSE",
    "headquarters": "Beaverton, Oregon, USA",
    "foundingDate": "1964",
    "wikidataId": "Q483915"
  },
  "dataSources": [
    { "name": "SEC EDGAR", "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=nike", "lastChecked": "2026-03-10" },
    { "name": "Wikidata", "url": "https://www.wikidata.org/wiki/Q483915", "lastChecked": "2026-03-10" },
    { "name": "Tranco List", "url": "https://tranco-list.eu/", "lastChecked": "2026-03-10" }
  ],
  "trancoRank": 312,
  "isMerchantAuthorized": true,
  "orbexaStoreUrl": "https://orbexa.io/store/nike.com",
  "auditVersion": 3,
  "lastVerified": "2026-03-10T12:00:00Z"
}
```

**Error responses:**

| Status | Meaning             |
|--------|---------------------|
| 404    | Domain not in registry |
| 429    | Rate limit exceeded (60 req/min) |
| 500    | Internal server error |

### 14.2 Search Registry

```
GET /api/otr/registry?q={query}&category={category}&badge={badge}&minScore={score}&limit={limit}&page={page}
```

Search the OTR merchant registry with optional filters.

**Query Parameters:**

| Parameter  | Type    | Description                                  |
|-----------|---------|----------------------------------------------|
| q         | string  | Search query (merchant name or domain)        |
| category  | string  | Business category filter                      |
| badge     | string  | Badge level filter (PLATINUM/GOLD/SILVER/BRONZE) |
| minScore  | number  | Minimum trust score (0-94)                    |
| limit     | number  | Results per page (default: 10, max: 50)       |
| page      | number  | Page number (default: 1)                      |

**Response (200 OK):**

```json
{
  "entries": [ "...VerifyApiResponse objects..." ],
  "total": 1250,
  "page": 1,
  "limit": 10,
  "totalPages": 125
}
```

### 14.3 Audit Endpoints

```
GET /api/otr/audit/chain-integrity        Verify hash chain integrity
GET /api/otr/audit/chain/{domain}          Domain scoring change history
GET /api/otr/audit/l2-anchors             Layer 2 blockchain anchor records
GET /api/otr/audit/snapshots              IPFS snapshot CIDs
```

## 15. MCP Server Integration

OTR provides an MCP (Model Context Protocol) server enabling AI agents to verify merchant trustworthiness directly within their tool-calling framework.

### 15.1 Configuration

```json
{
  "mcpServers": {
    "otr": {
      "command": "npx",
      "args": ["@otr-protocol/mcp-server"]
    }
  }
}
```

### 15.2 Available Tools

| Tool                | Description                                                    |
|---------------------|----------------------------------------------------------------|
| `verify_merchant`   | Verify trust score for a domain. Returns score, badge, 7-dimension breakdown, entity data, and verification evidence. |
| `search_registry`   | Search the OTR merchant registry by name, category, score, or badge. |
| `get_refund_policy`  | Get machine-readable refund and return policy information for a domain. |

### 15.3 Environment Variables

| Variable      | Default              | Description              |
|---------------|----------------------|--------------------------|
| OTR_API_URL   | https://orbexa.io    | OTR API base URL         |

## 16. Recommendation Decision Logic

AI agents SHOULD use the following decision logic when making purchase recommendations based on OTR trust data:

### 16.1 Verified Merchants (with fulfillment data)

| Trust Score | Recommendation           | Guidance                                       |
|------------|--------------------------|------------------------------------------------|
| >= 75      | SAFE_TO_RECOMMEND        | Merchant has strong trust and verified fulfillment |
| 65-74      | RECOMMEND_WITH_NOTE      | Merchant is credible; note limited trust history   |
| 55-64      | RECOMMEND_WITH_CAUTION   | Exercise caution; limited verification data        |
| < 55       | DO_NOT_RECOMMEND         | Insufficient trust for recommendation              |

### 16.2 Public Assessment (no fulfillment data)

| Trust Score | Recommendation           | Guidance                                       |
|------------|--------------------------|------------------------------------------------|
| >= 80      | SAFE_TO_RECOMMEND        | Strong public trust signals                    |
| 70-79      | RECOMMEND_WITH_NOTE      | Good trust signals; no fulfillment data        |
| 60-69      | RECOMMEND_WITH_CAUTION   | Basic trust; no fulfillment verification       |
| < 60       | DO_NOT_RECOMMEND         | Insufficient trust for recommendation          |

### 16.3 Domain Not Found

If a domain is not in the OTR registry, the recommendation MUST be `DO_NOT_RECOMMEND`. AI agents SHOULD inform the consumer that the merchant has not been assessed.

## 17. Data Source Requirements

OTR scoring evidence is derived from the following data sources. All data sources are publicly verifiable or merchant-provided.

| Data Source      | Dimensions Fed           | Update Frequency | Verification Method         |
|------------------|--------------------------|------------------|-----------------------------|
| SEC EDGAR        | Identity                 | Daily            | Direct API query             |
| Wikidata         | Identity                 | Weekly           | SPARQL query                 |
| Tranco List      | Identity                 | Monthly          | Published ranking list        |
| Corporate Registry| Identity                | Weekly           | Registry API query           |
| WHOIS            | Identity                 | Weekly           | RDAP/WHOIS lookup            |
| DNS Records      | Technical                | Daily            | Direct DNS queries           |
| SSL Certificate  | Technical                | Daily            | TLS handshake inspection     |
| Website Scan     | PolicyScore, WebPresence | Weekly           | Automated crawler            |
| Compliance Audit | Compliance               | Quarterly        | External audit reports       |
| Merchant API     | DataQuality, Fulfillment | Real-time        | OAuth 2.0 API integration    |
| Logistics Audit  | Fulfillment              | Per-order sample | Tracking number verification |

## 18. Federation Model

OTR is designed for progressive federation across three phases. See [Federation Specification](./FEDERATION.md) for the complete specification.

### 18.1 Phase 1: Single Validator (Current)

ORBEXA operates as the sole validator. The algorithm is open-source for independent verification.

### 18.2 Phase 2: Federated Validators

2-3 accredited organizations run independent validators. Multi-validator consensus (3+ validators within +/-5 points) produces "confirmed" status.

### 18.3 Phase 3: Open Federation

Any accredited organization may join. A governance council with elected representatives oversees protocol changes. Deterministic scoring eliminates discretionary divergence across validators.

**Key federation principles:**
- Deterministic scoring is the foundation — same inputs produce same outputs from any validator
- Append-only transparency log (Merkle tree) makes all assessments publicly auditable
- Validators sign assessments with ECDSA P-256 keys
- Federated score isolation: never directly trust external scores; always re-compute from raw inputs

## 19. Scoring Independence and Fairness

OTR trust scores are computed using **deterministic, open-source algorithms** based solely on objective, verifiable data. The following commitments are fundamental to the protocol:

1. **No Score Selling** — OTR scores cannot be purchased, influenced, or manipulated through any commercial relationship.

2. **No Pay-for-Trust** — Whether a merchant is a SaaS subscriber has NO direct impact on their OTR trust score. A non-paying merchant with excellent signals scores identically to a paying subscriber with the same signals.

3. **No Human Override** — Scores are not subject to manual adjustment, editorial influence, or case-by-case exceptions.

4. **Algorithmic Transparency** — The scoring algorithm is fully open-source under the MIT License. Anyone can audit, reproduce, and verify any trust score.

5. **No Time-Based Scoring** — Scores are purely behavior-data-driven. A merchant with 1 month of excellent data scores the same as one with 12 months of the same data quality. Time on platform does NOT influence scoring.

6. **Verifiable Reproducibility** — The conformance test suite provides standard test vectors. Any implementation that passes all test vectors is guaranteed to produce identical scores for any input.

## 20. Conformance

### 20.1 Test Vectors

Implementations MUST produce identical outputs for the standard test vectors in `conformance/test-vectors.json`. The conformance test runner validates:

- Phase detection (Public Assessment vs. Verified Merchant)
- All 7 dimension scores
- Fast-Track bonus calculation
- Composite trust score
- Badge assignment
- Tier assignment

### 20.2 Running Conformance Tests

```bash
npx tsx conformance/runner.ts
```

### 20.3 Conformance Levels

| Level      | Requirement                                          |
|-----------|------------------------------------------------------|
| FULL       | All test vectors pass with exact score match          |
| PARTIAL    | All test vectors pass within ±1 point (rounding)     |
| NONE       | Any test vector fails by more than ±1 point          |

Only FULL conformance qualifies an implementation for federation participation.

## 21. Security Considerations

### 21.1 Score Manipulation

The primary security threat is adversarial score manipulation. OTR mitigates this through:

- Heavy weighting of unforgeable signals (Identity at 0.55 in Public Assessment)
- Anti-gaming detection with multiplier penalties
- Domain age gates preventing newly-registered domains from achieving high scores
- Score cap at 94 preventing perfect scores without manual review

### 21.2 Data Integrity

- All scoring evidence SHOULD be independently verifiable from public sources.
- Signed trust manifests use ECDSA P-256 for tamper detection.
- The transparency log uses Merkle trees for append-only integrity.
- L2 blockchain anchoring provides external immutability guarantees.

### 21.3 Privacy

See [Data Desensitization Specification](./DATA-DESENSITIZATION.md) for the complete data handling and privacy specification. OTR scoring does NOT require or process consumer PII. All scoring inputs are merchant-level business data.

## 22. References

| Document | Description |
|----------|-------------|
| [OTR Scoring Algorithm v3](./SCORING-ALGORITHM-v3.md) | Detailed scoring formulas and point allocations |
| [Trust Manifest JSON Schema](./TRUST-MANIFEST.schema.json) | JSON Schema for trust.json validation |
| [Anti-Fraud Framework](./ANTI-FRAUD-FRAMEWORK.md) | 9-layer anti-fraud detection engine |
| [Data Desensitization](./DATA-DESENSITIZATION.md) | Four-level data desensitization architecture |
| [Federation Specification](./FEDERATION.md) | Multi-validator federation model |
| [Logistics Audit Framework](./LOGISTICS-AUDIT.md) | Fulfillment verification methodology |
| [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) | Key words for use in RFCs |
| [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) | A File Format to Aid in Security Vulnerability Disclosure (security.txt) |
