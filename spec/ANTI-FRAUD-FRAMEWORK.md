# OTR Anti-Fraud Framework

**9-Layer Fraud Detection Engine for Merchant Trust Verification**

**Status:** Draft
**Version:** 3.0.0
**Date:** 2026-03-11
**Authors:** ORBEXA <dev@orbexa.io>
**License:** MIT

---

## Table of Contents

1. [Overview](#1-overview)
2. [Threat Model](#2-threat-model)
3. [9-Layer Detection Architecture](#3-9-layer-detection-architecture)
4. [Layer 1: Domain Age and Registration Data](#4-layer-1-domain-age-and-registration-data)
5. [Layer 2: DNS Security Signals](#5-layer-2-dns-security-signals)
6. [Layer 3: SSL/TLS Certificate Analysis](#6-layer-3-ssltls-certificate-analysis)
7. [Layer 4: Website Content Analysis](#7-layer-4-website-content-analysis)
8. [Layer 5: Entity Verification](#8-layer-5-entity-verification)
9. [Layer 6: Traffic Analysis](#9-layer-6-traffic-analysis)
10. [Layer 7: Policy Page Analysis](#10-layer-7-policy-page-analysis)
11. [Layer 8: Cross-Reference Validation](#11-layer-8-cross-reference-validation)
12. [Layer 9: Anti-Gaming Detection](#12-layer-9-anti-gaming-detection)
13. [Fraud Score Aggregation](#13-fraud-score-aggregation)
14. [Impact on Trust Scoring](#14-impact-on-trust-scoring)
15. [Operational Procedures](#15-operational-procedures)

---

## 1. Overview

The OTR Anti-Fraud Framework is a 9-layer detection engine designed to identify fraudulent, deceptive, or adversarially-optimized merchant domains. It operates as a pre-processing and post-processing layer around the OTR trust scoring engine, ensuring that trust scores accurately reflect genuine merchant credibility rather than manufactured signals.

### 1.1 Design Principles

1. **Defense in depth** — No single detection layer is sufficient. Multiple independent layers provide overlapping coverage.
2. **Signal correlation** — Fraud patterns are identified by cross-referencing signals across layers, not by any single data point.
3. **Unforgeable anchors** — Detection is anchored to signals that are difficult or impossible to fabricate (SEC filings, Tranco rankings, Wikidata entities, domain age).
4. **Proportional response** — Detected fraud patterns apply proportional penalties (multipliers) rather than binary rejection, allowing borderline cases to be flagged rather than silently excluded.
5. **Transparency** — All detection patterns and their triggers are documented and open-source. Merchants can understand why their scores were adjusted.

### 1.2 Scope

The Anti-Fraud Framework addresses:

- **Fraudulent merchant domains** — Sites created solely to collect payments without delivering goods.
- **Trust score gaming** — Adversarial optimization of easily-manipulated signals to inflate trust scores.
- **Impersonation attacks** — Domains designed to appear as legitimate brands they are not.
- **Template-based fraud** — Mass-produced sites using identical templates, policy text, and configurations.

The framework does NOT address:

- Consumer fraud (buyer-side fraud is outside OTR's scope).
- Payment fraud (covered by payment processors).
- Content legality (OTR does not assess the legality of products sold).

## 2. Threat Model

### 2.1 Adversary Profiles

| Adversary Type        | Capability                                      | Goal                              |
|-----------------------|-------------------------------------------------|-----------------------------------|
| Opportunistic Scammer | Registers cheap domains, copies templates        | Quick payment collection           |
| Sophisticated Gamer   | Optimizes all gameable signals systematically    | Achieve BRONZE/SILVER badge        |
| Impersonator          | Creates look-alike domains of legitimate brands  | Deceive AI agents via brand confusion |
| Network Operator      | Operates 10s-100s of domains from same infrastructure | Scale fraud across many domains |

### 2.2 Attack Surface

Gameable signals that adversaries target:

| Signal Category | Ease of Gaming | Cost to Implement | Time to Deploy |
|----------------|---------------|-------------------|----------------|
| DV SSL cert    | Trivial       | $0 (Let's Encrypt)| Minutes        |
| DNS records (SPF/DKIM/DMARC) | Easy | $0             | Hours          |
| HSTS, CAA, security.txt | Easy  | $0               | Hours          |
| Privacy policy page | Easy    | $0 (template)     | Minutes        |
| Terms of service | Easy       | $0 (template)     | Minutes        |
| robots.txt, sitemap | Easy   | $0                 | Minutes        |
| Schema.org JSON-LD | Moderate | $0                | Hours          |
| SEC filing     | Impossible    | N/A                | N/A            |
| Wikidata entity| Very Hard     | N/A (community-reviewed) | Months  |
| Tranco Top 100K| Very Hard     | N/A (requires real traffic) | Years  |
| Company age > 5yr | Impossible | N/A               | 5+ years       |

## 3. 9-Layer Detection Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    OTR Anti-Fraud Engine                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Layer 1: Domain Age & Registration Data                  │
│  ├── WHOIS age, registrar reputation, privacy shield     │
│  │                                                       │
│  Layer 2: DNS Security Signals                            │
│  ├── DMARC, SPF, DKIM, HSTS configuration analysis      │
│  │                                                       │
│  Layer 3: SSL/TLS Certificate Analysis                    │
│  ├── Certificate type, issuer, validity chain            │
│  │                                                       │
│  Layer 4: Website Content Analysis                        │
│  ├── Content quality, originality, functional depth      │
│  │                                                       │
│  Layer 5: Entity Verification                             │
│  ├── Wikidata, SEC, corporate registry cross-check       │
│  │                                                       │
│  Layer 6: Traffic Analysis                                │
│  ├── Tranco ranking, traffic pattern consistency         │
│  │                                                       │
│  Layer 7: Policy Page Analysis                            │
│  ├── Policy completeness, template detection, specificity│
│  │                                                       │
│  Layer 8: Cross-Reference Validation                      │
│  ├── Multi-source signal consistency verification        │
│  │                                                       │
│  Layer 9: Anti-Gaming Detection (NEW in v3)               │
│  ├── Signal-brand mismatch, time clustering, domain gate │
│  │                                                       │
├──────────────────────────────────────────────────────────┤
│  Output: FraudAssessment {                                │
│    severity: CLEAN | SUSPICIOUS | LIKELY_GAMING           │
│    multiplier: 0.0 - 1.0                                 │
│    patterns: string[]                                     │
│  }                                                        │
└──────────────────────────────────────────────────────────┘
```

## 4. Layer 1: Domain Age and Registration Data

### 4.1 Purpose

Domain age is one of the strongest fraud indicators. Fraudulent domains are typically registered recently and abandoned after a short operational period. Legitimate businesses maintain domains for years or decades.

### 4.2 Signals Assessed

| Signal                  | Risk Indicator                              | Weight  |
|-------------------------|---------------------------------------------|---------|
| Domain age < 6 months   | Very high fraud risk                        | Critical|
| Domain age < 12 months  | High fraud risk                             | High    |
| Domain age < 24 months  | Elevated fraud risk                         | Medium  |
| Domain age >= 5 years   | Low fraud risk                              | Low     |
| WHOIS privacy shield    | Neutral (common for legitimate and fraud)    | Info    |
| Registrar reputation    | Cheap/bulk registrars correlate with fraud   | Medium  |
| Registration duration   | 1-year registration vs. multi-year           | Low     |

### 4.3 Domain Age Gates

Domain age gates enforce hard caps on gameable dimension scores:

| Domain Age     | Gameable Dimension Cap | Rationale                                    |
|----------------|----------------------|----------------------------------------------|
| < 6 months     | 50                   | New domains cannot prove trustworthiness      |
| < 12 months    | 75                   | Young domains have limited track record       |
| >= 12 months   | 100 (no cap)         | Sufficient operational history                |

**Cap application:** When a domain age gate is active, gameable dimensions (Technical, PolicyScore, WebPresence) are multiplied by `cap / 100` before composite scoring. This is equivalent to the anti-gaming multiplier system.

### 4.4 WHOIS Data Consistency

WHOIS data is cross-referenced with entity data from other layers:

- Registrant name should be consistent with corporate registry data.
- Registrant organization should match the claimed merchant identity.
- Nameserver configuration should match claimed hosting infrastructure.
- Inconsistencies contribute to the cross-reference validation score (Layer 8).

## 5. Layer 2: DNS Security Signals

### 5.1 Purpose

DNS security configuration (DMARC, SPF, DKIM, HSTS) indicates technical competence and investment in email/web security. While these signals are individually gameable, their pattern of adoption provides fraud intelligence.

### 5.2 Signals Assessed

| Signal        | Legitimate Pattern                         | Fraud Pattern                            |
|---------------|--------------------------------------------|-----------------------------------------|
| DMARC         | reject/quarantine with proper alignment    | Often missing or set to "none"           |
| SPF           | Specific IP ranges, include mechanism      | Overly broad (+all) or missing           |
| DKIM          | Proper key rotation, selector naming       | Missing or default hosting config        |
| HSTS          | Long max-age, includeSubdomains           | Short max-age or missing                 |
| MTA-STS       | Present with enforce mode                  | Usually missing                          |
| CAA           | Specific CA authorization                  | Missing (not indicative alone)           |

### 5.3 Suspicious Pattern: All DNS Security Deployed Simultaneously

When ALL of the following appear on a domain less than 12 months old:

- DMARC reject
- SPF present
- DKIM present
- HSTS present
- CAA present
- security.txt present

This pattern is flagged as potential **time clustering** — a gaming indicator where all signals were deployed simultaneously to maximize the Technical dimension score. Legitimate businesses typically adopt these incrementally over time.

## 6. Layer 3: SSL/TLS Certificate Analysis

### 6.1 Purpose

SSL certificate type and configuration provide fraud intelligence. Extended Validation (EV) certificates require organizational verification and cannot be obtained trivially. Domain Validation (DV) certificates require no identity verification.

### 6.2 Signals Assessed

| Signal              | Trust Signal                               | Fraud Risk              |
|---------------------|--------------------------------------------|-----------------------|
| EV Certificate      | Strong (requires organizational verification) | Very Low             |
| OV Certificate      | Moderate (requires some verification)       | Low                   |
| DV Certificate      | Minimal (automated issuance)               | Neutral               |
| Free DV (Let's Encrypt) | Minimal                                | Elevated (if young domain) |
| Self-signed         | None                                       | High                  |
| Expired certificate | Negative                                   | Critical              |
| Short validity      | Neutral                                    | Low                   |
| Certificate chain   | Complete chain = normal                    | Incomplete = suspicious |

### 6.3 Certificate-Domain Consistency

The certificate subject MUST match the assessed domain. Wildcard certificates (*.example.com) are acceptable but noted. Multi-domain certificates (SAN) are cross-referenced with the merchant's claimed domain portfolio.

## 7. Layer 4: Website Content Analysis

### 7.1 Purpose

Website content analysis evaluates whether the site represents a genuine commercial operation with real products, services, and functional e-commerce capabilities.

### 7.2 Signals Assessed

| Signal                   | Legitimate Pattern                          | Fraud Pattern                            |
|--------------------------|---------------------------------------------|------------------------------------------|
| Product catalog depth    | Hundreds to thousands of unique products    | Few products, duplicated content         |
| Product descriptions     | Unique, detailed descriptions               | Copied from other sites or generic       |
| Image quality            | High-resolution, multiple angles            | Stock photos, watermarked images         |
| Contact information      | Physical address, phone, email              | Only web forms or missing entirely       |
| Company history/about    | Detailed, verifiable history                | Vague or templated "about us" text       |
| Functional checkout      | Complete checkout flow with payment options | Broken, incomplete, or suspicious flows  |
| Customer reviews         | Variety of reviews over time                | All recent, suspiciously positive        |
| Social media links       | Active, established profiles                | Dead links or newly-created profiles     |

### 7.3 Content Originality

Content is checked against known template databases and common fraud patterns:

- **Template sites** — Sites generated from templates (Shopify themes, WooCommerce templates) are not penalized by default but are flagged when combined with other risk signals.
- **Content duplication** — Significant content overlap with known fraudulent domains is a strong fraud indicator.
- **Placeholder content** — Lorem ipsum text, default template content, or incomplete product listings indicate a non-operational site.

## 8. Layer 5: Entity Verification

### 8.1 Purpose

Entity verification confirms that the merchant is a real, identifiable organization with verifiable presence in authoritative databases.

### 8.2 Data Sources

| Source              | What It Proves                              | Forgery Difficulty |
|---------------------|---------------------------------------------|-------------------|
| **Wikidata**        | Notable entity with community verification  | Very Hard          |
| **SEC EDGAR**       | US-regulated public company                 | Impossible         |
| **Corporate Registry** | Legally registered entity                | Hard               |
| **DUNS/Bradstreet** | Business credit and registration           | Hard               |
| **Companies House** | UK-registered entity                       | Hard               |
| **EU Business Register** | EU-registered entity                  | Hard               |

### 8.3 Verification Logic

```
Entity verification score = f(
    SEC filing match:           +20 points (if US exchange)
    Non-US exchange listing:    +15 points
    Wikidata entity match:      +15 points
    Corporate registry match:   +10 points
    Consistent WHOIS data:      +5 points
    Parent company verified:    +10 points
)
```

Entity verification failures (e.g., claimed entity does not exist in referenced database) are strong negative indicators that feed into Layer 8 cross-reference validation.

## 9. Layer 6: Traffic Analysis

### 9.1 Purpose

Traffic analysis uses the Tranco ranking as a proxy for legitimate web traffic. The Tranco list aggregates multiple traffic measurement sources (Umbrella, Majestic, etc.) with built-in manipulation resistance.

### 9.2 Tranco Ranking Interpretation

| Tranco Rank    | Traffic Level         | Fraud Risk | Trust Signal |
|----------------|-----------------------|-----------|-------------|
| Top 1,000      | Global major site     | Very Low  | Very Strong  |
| Top 10,000     | Major commercial site | Low       | Strong       |
| Top 100,000    | Established site      | Low       | Moderate     |
| Top 1,000,000  | Active site           | Medium    | Weak         |
| Not ranked     | Minimal traffic       | High      | None         |

### 9.3 Traffic-Identity Correlation

Traffic analysis is cross-referenced with entity verification:

- **High traffic + no entity data** — Unusual but not necessarily fraudulent (e.g., new viral site).
- **No traffic + strong entity data** — May indicate new domain for established company (acceptable).
- **No traffic + no entity data** — Strong fraud risk indicator.
- **High traffic + strong entity data** — Expected pattern for legitimate major merchants.

## 10. Layer 7: Policy Page Analysis

### 10.1 Purpose

Policy pages (privacy policy, terms of service, refund policy) are scanned for completeness, specificity, and originality. While the presence of policy pages contributes to PolicyScore, the quality of those pages provides fraud intelligence.

### 10.2 Quality Indicators

| Indicator                  | Legitimate Pattern                    | Fraud Pattern                      |
|----------------------------|---------------------------------------|------------------------------------|
| Specificity                | Company name, jurisdiction, dates     | Generic, no company details        |
| Contact details            | Physical address, legal entity name   | Missing or PO box only             |
| Return/refund specifics    | Specific timeframes, conditions       | Vague or unrealistic promises      |
| Legal jurisdiction         | Named jurisdiction and governing law  | No jurisdiction specified          |
| Last updated date          | Recent, specific date                 | Missing or clearly fake date       |
| Cookie consent specifics   | Named cookies, purposes, third parties| Generic boilerplate only           |

### 10.3 Template Policy Detection

Known policy templates are fingerprinted and flagged:

- **Free privacy policy generators** — These produce recognizable boilerplate text. Their presence is not penalizing alone but contributes to the template detection score.
- **Identical policies across domains** — Multiple domains sharing identical policy text (beyond templates) indicates a network operation.
- **Policy-domain mismatch** — Policy text referencing a different company name or domain is a strong fraud indicator.

## 11. Layer 8: Cross-Reference Validation

### 11.1 Purpose

Cross-reference validation compares signals across all previous layers to identify inconsistencies that indicate fraud or misrepresentation.

### 11.2 Consistency Checks

| Check                                | Expected Consistency                         | Failure Indicates           |
|--------------------------------------|----------------------------------------------|-----------------------------|
| WHOIS registrant vs. entity name     | Match or related entity                      | Possible impersonation      |
| Certificate subject vs. domain       | Exact or wildcard match                      | Configuration error or fraud|
| Policy company name vs. entity data  | Match                                        | Template copy or impersonation |
| HQ location vs. WHOIS country        | Same country or logical relationship         | Possible misrepresentation  |
| Tranco rank vs. content depth        | High rank = deep content                     | Traffic manipulation        |
| Domain age vs. company age           | Domain registered around or after founding   | Possible squatting          |
| SSL type vs. entity size             | Large entities often have EV/OV              | Not inherently suspicious   |
| DNS config vs. domain age            | Gradual adoption over time                   | Time clustering (gaming)    |

### 11.3 Inconsistency Scoring

Each failed consistency check contributes to a cumulative inconsistency score. The scoring is weighted:

| Inconsistency Severity | Weight | Examples                                      |
|------------------------|--------|-----------------------------------------------|
| Critical               | 3      | Policy references different company name      |
| High                   | 2      | WHOIS registrant contradicts entity data      |
| Medium                 | 1      | Domain age significantly younger than company |
| Low                    | 0.5    | Minor metadata inconsistencies                |

## 12. Layer 9: Anti-Gaming Detection

Layer 9 is the **primary defense** added in OTR v3.0 against sophisticated adversarial optimization. It operates after dimension scoring and directly affects the composite trust score through multiplier adjustments.

### 12.1 Signal-Brand Mismatch Detection

**Trigger condition:**
```
technical >= 80
AND NOT hasWikidataId
AND NOT hasStockSymbol
AND (trancoRank IS NULL OR trancoRank > 100,000)
AND (companyAge IS NULL OR companyAge < 2)
```

**Rationale:** A domain with excellent technical security configuration but no verifiable brand identity (no Wikidata entry, no stock listing, no significant web traffic) and a young or unknown age is anomalous. Legitimate businesses that invest in comprehensive security configuration are almost always identifiable in public databases.

**Action:** Apply multiplier of **0.5** to gameable dimensions.

### 12.2 Time Clustering Detection

**Trigger condition:**
```
technical >= 90
AND policyScore >= 90
AND webPresence >= 90
AND identity < 30
```

**Rationale:** Near-perfect scores across all three gameable dimensions combined with minimal identity is the hallmark of systematic trust score optimization. Legitimate businesses accumulate these signals incrementally; adversaries deploy them simultaneously.

**Action:** Apply multiplier of **0.7** to gameable dimensions.

### 12.3 Domain Age Gate

**Trigger condition:**
```
companyAge < 0.5    →  cap gameable dimensions at 50  (multiplier = 0.5)
companyAge < 1.0    →  cap gameable dimensions at 75  (multiplier = 0.75)
```

**Rationale:** Very young domains have not had sufficient time to establish genuine trust. Even if all gameable signals are maximized, the domain lacks the operational history to justify high trust.

**Action:** Apply multiplier of **0.5** (< 6 months) or **0.75** (< 12 months) to gameable dimensions.

### 12.4 Template Policy Detection

**Trigger condition:**
- Privacy policy matches a known generator template fingerprint.
- Multiple policy pages share identical text structure with other flagged domains.
- Policy text references a different company name or domain.

**Rationale:** Mass-produced policy pages from generators or copied from other sites indicate minimal genuine compliance effort.

**Action:** Apply multiplier of **0.5** to gameable dimensions.

### 12.5 Multiplier Resolution

When multiple anti-gaming patterns are detected simultaneously, the **lowest (most severe) multiplier** is applied:

```
function resolveMultiplier(detectedPatterns):
    worstMultiplier = 1.0
    for each pattern in detectedPatterns:
        worstMultiplier = min(worstMultiplier, pattern.multiplier)
    return worstMultiplier
```

**Examples:**

| Detected Patterns                         | Individual Multipliers | Resolved Multiplier |
|-------------------------------------------|----------------------|---------------------|
| Signal-Brand Mismatch only                | 0.5                  | 0.5                 |
| Domain Age < 6 months only               | 0.5                  | 0.5                 |
| Domain Age < 1 year + Time Clustering     | 0.75, 0.7            | 0.7                 |
| Signal-Brand Mismatch + Domain Age < 6mo  | 0.5, 0.5             | 0.5                 |

## 13. Fraud Score Aggregation

### 13.1 Severity Classification

| Severity        | Multiplier Range | Description                                                |
|-----------------|------------------|------------------------------------------------------------|
| **CLEAN**       | 1.0              | No gaming patterns detected. Scores are unmodified.        |
| **SUSPICIOUS**  | (0.5, 1.0)       | One or more weak gaming indicators. Scores moderately adjusted. |
| **LIKELY_GAMING** | <= 0.5         | Strong gaming indicators. Scores significantly reduced.    |

### 13.2 Output Format

```typescript
interface AntiGamingResult {
  /** Overall severity classification */
  severity: "CLEAN" | "SUSPICIOUS" | "LIKELY_GAMING";

  /** Multiplier applied to gameable dimensions (0.0 - 1.0) */
  multiplier: number;

  /** List of detected patterns with human-readable descriptions */
  patterns: string[];
}
```

### 13.3 Example Outputs

**Clean merchant:**
```json
{
  "severity": "CLEAN",
  "multiplier": 1.0,
  "patterns": []
}
```

**Suspicious gaming site:**
```json
{
  "severity": "SUSPICIOUS",
  "multiplier": 0.75,
  "patterns": [
    "DOMAIN_AGE_GATE: Domain under 1 year, gameable dimensions capped"
  ]
}
```

**Likely gaming site:**
```json
{
  "severity": "LIKELY_GAMING",
  "multiplier": 0.5,
  "patterns": [
    "SIGNAL_BRAND_MISMATCH: High technical score with no verifiable brand identity",
    "DOMAIN_AGE_GATE: Domain under 6 months, gameable dimensions capped"
  ]
}
```

## 14. Impact on Trust Scoring

### 14.1 Dimension Multiplier Application

Anti-gaming multipliers are applied **only** to gameable dimensions:

| Dimension   | Affected by Anti-Gaming? | Rationale                                    |
|-------------|-------------------------|----------------------------------------------|
| Identity    | **No** (never penalized)| Unforgeable; should not be reduced            |
| Technical   | **Yes**                 | Easily gameable; primary gaming target        |
| Compliance  | **No** (never penalized)| Status-based; not directly gameable           |
| PolicyScore | **Yes**                 | Easily gameable; template policies common     |
| WebPresence | **Yes**                 | Easily gameable; template sites common        |
| DataQuality | **No** (never penalized)| Requires API integration; not externally gameable |
| Fulfillment | **No** (never penalized)| Requires real orders; not externally gameable |

### 14.2 Scoring Pipeline

The anti-gaming adjustment occurs **between** dimension scoring and composite calculation:

```
1. Compute raw dimension scores: identity, technical, ..., fulfillment
2. Run anti-gaming detection → { severity, multiplier, patterns }
3. If multiplier < 1.0:
   adjusted_technical   = round(technical × multiplier)
   adjusted_policyScore = round(policyScore × multiplier)
   adjusted_webPresence = round(webPresence × multiplier)
4. Compute weighted composite using adjusted scores
5. Add Brand Fast-Track bonus
6. Cap at 94
```

### 14.3 Impact Examples

**Scenario: Gaming site with perfect gameable signals, domain < 6 months**

| Dimension   | Raw Score | After ×0.5 | Weight (PA) | Contribution |
|-------------|-----------|-----------|-------------|-------------|
| Identity    | 5         | 5         | 0.55        | 2.75        |
| Technical   | 100       | 50        | 0.15        | 7.50        |
| PolicyScore | 90        | 45        | 0.15        | 6.75        |
| WebPresence | 85        | 43        | 0.15        | 6.45        |
| **Total**   |           |           |             | **23.45 → 23 (UNRATED)** |

Without anti-gaming: `5×0.55 + 100×0.15 + 90×0.15 + 85×0.15 = 44 (UNRATED)`

The anti-gaming adjustment reduces the score from 44 to 23, making it even clearer that this domain should not be recommended.

## 15. Operational Procedures

### 15.1 Monitoring

- Anti-gaming detection results are logged for every trust assessment.
- Aggregate statistics on severity distribution are published in the transparency log.
- Sudden spikes in SUSPICIOUS or LIKELY_GAMING assessments trigger manual review of detection thresholds.

### 15.2 False Positive Handling

If a legitimate merchant is flagged by anti-gaming detection:

1. The merchant can improve their **Identity** dimension (the unforgeable anchor) to reduce gaming suspicion.
2. Specifically: obtaining a Wikidata entry, verifying corporate registry data, or allowing sufficient domain aging will naturally resolve false positives.
3. There is **no manual override** mechanism. The algorithmic approach ensures consistent treatment.

### 15.3 Evolution

Anti-gaming detection patterns are updated through the standard RFC process:

1. New pattern proposed with supporting evidence.
2. 30-day public comment period.
3. Conformance test vectors updated.
4. Implementation deployed with 7-day monitoring period.
5. Pattern promoted to stable status.
