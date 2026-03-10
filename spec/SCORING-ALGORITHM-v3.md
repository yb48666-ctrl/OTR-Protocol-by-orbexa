# OTR Scoring Algorithm v3.0

**Deterministic Trust Scoring for AI Agent Commerce**

---

## Overview

The OTR scoring algorithm computes a composite trust score (0-94) from
7 independent dimensions. The algorithm is **deterministic**: identical
inputs always produce identical outputs, regardless of implementation.

## Dimension Scoring Functions

### 1. Identity (0-100)

Measures unforgeable brand identity signals.

| Signal                    | Points | Condition                 |
|--------------------------|--------|---------------------------|
| SEC Filing (US Exchange) | +20    | NYSE, NASDAQ, NYSE ARCA   |
| Non-US Stock Exchange    | +15    | Any other exchange         |
| Wikidata Entity          | +15    | Has QID                   |
| Company Age ≥ 10 years   | +10    | Founded year verified     |
| Company Age < 10 years   | +5     | Has founded year          |
| Headquarters Data        | +5     | Location on record        |
| Parent Company           | +10    | Parent organization known |
| Tranco Rank ≤ 1K         | +15    | Top 1,000 domains         |
| Tranco Rank ≤ 5K         | +12    |                           |
| Tranco Rank ≤ 10K        | +10    |                           |
| Tranco Rank ≤ 50K        | +7     |                           |
| Tranco Rank ≤ 100K       | +5     |                           |
| Tranco Rank ≤ 500K       | +3     |                           |
| Tranco Rank ≤ 1M         | +2     |                           |

### 2. Technical (0-100)

Measures DNS and SSL security configuration.

| Signal           | Points | Condition              |
|-----------------|--------|------------------------|
| EV SSL          | +25    | Extended Validation    |
| OV/DV SSL       | +15    | Organization/Domain    |
| DMARC reject    | +20    | Strictest policy       |
| DMARC quarantine| +15    |                        |
| SPF Record      | +15    | Sender Policy Framework|
| DKIM Record     | +10    | DomainKeys             |
| HSTS            | +10    | Strict Transport       |
| CAA Record      | +5     | Certificate Authority  |
| security.txt    | +5     | RFC 9116               |
| MTA-STS         | +5     | Mail Transport         |

### 3. Compliance (0-100)

Status-based compliance scoring.

| Status    | Score | Condition                           |
|-----------|-------|-------------------------------------|
| VERIFIED  | 85    | Audit passed                        |
| PARTIAL   | 72    | Partial compliance evidence         |
| INFERRED  | 50    | High-compliance industry (baseline) |
| PENDING   | 0     | No compliance data                  |

If a pre-computed `complianceScore > 0` exists, it is used directly.

**High Compliance Industries:** Financial Services, Banking, Insurance,
Healthcare, Pharmaceuticals, Food & Beverage, Telecommunications,
Education, Government, Energy.

### 4. PolicyScore (0-100)

Measures consumer policy completeness via website scanning.

| Signal             | Points | Condition              |
|-------------------|--------|------------------------|
| Privacy Policy    | +20    | Page exists            |
| GDPR Provisions   | +10    | In privacy policy      |
| CCPA Provisions   | +10    | In privacy policy      |
| Refund Policy     | +20    | Page exists            |
| Return ≥ 30 days  | +5     | Liberal return window  |
| Terms of Service  | +15    | Page exists            |
| Cookie Consent    | +10    | Mechanism present      |

### 5. WebPresence (0-100)

Measures website professionalism and AI discoverability.

| Signal              | Points | Condition              |
|--------------------|--------|------------------------|
| robots.txt         | +10    | Exists and valid       |
| Crawler-Allowed    | +5     | Allows major crawlers  |
| sitemap.xml        | +10    | Exists                 |
| Schema.org JSON-LD | +15    | Structured data        |
| Organization Schema| +10    | Complete (name+url+logo)|
| Multi-Language     | +5     | hreflang tags          |
| Viewport Meta      | +5     | Mobile-friendly        |
| Favicon            | +5     | Icon present           |
| Page Content       | +20    | Real content loads     |

### 6. DataQuality (0-100)

Requires Verified Merchant API integration.

| Signal           | Points |
|-----------------|--------|
| Product Catalog  | +30    |
| Pricing Data     | +25    |
| Inventory Sync   | +20    |
| Rich Media       | +15    |
| Structured Data  | +10    |

### 7. Fulfillment (0-100)

Requires Verified Merchant API integration.

| Signal            | Points | Condition          |
|------------------|--------|--------------------|
| Shipping Policy   | +25    | API-provided       |
| Return Policy     | +25    | API-provided       |
| Delivery < 5 days | +20    | Average days       |
| Return ≥ 30 days  | +15    | Window days        |
| Order Tracking    | +15    | Tracking available |

## Composite Score Calculation

```
composite = Σ(dimension_score × weight) + fast_track_bonus
trustScore = min(round(composite), 94)
```

### Public Assessment Weights

```
identity × 0.55 + technical × 0.15 + policyScore × 0.15 + webPresence × 0.15
```

### Verified Merchant Weights

```
identity × 0.15 + technical × 0.05 + compliance × 0.10 + policyScore × 0.05
+ webPresence × 0.05 + dataQuality × 0.25 + fulfillment × 0.35
```

## Anti-Gaming Adjustments

When gaming is detected, gameable dimension scores (Technical, PolicyScore,
WebPresence) are multiplied by a penalty factor before composite calculation:

- Signal-Brand Mismatch → ×0.5
- Domain Age < 6 months → ×0.5
- Domain Age < 1 year → ×0.75
- Time Clustering/Perfect Gameable → ×0.7

## Scoring Fairness Guarantees

1. Scores are **purely behavior-data-driven**
2. Scores are **NOT linked to integration time** with any platform
3. Scores **cannot be purchased** through any commercial relationship
4. The algorithm is **fully open-source** and independently verifiable
5. **No human override** — all scores are algorithmically computed
