# OTR Protocol Specification v3.0

**Open Trust Registry — Merchant Trust Verification Protocol for AI Agent Commerce**

**Status:** Draft
**Version:** 3.0.0
**Date:** 2026-03-11
**Authors:** ORBEXA <dev@orbexa.io>

---

## 1. Abstract

The Open Trust Registry (OTR) protocol defines a deterministic, open-source
framework for assessing merchant trustworthiness in AI agent commerce. When AI
agents make purchase decisions on behalf of consumers, they need a reliable,
verifiable answer to: **"Is this merchant trustworthy enough to recommend?"**

OTR fills the **merchant trust layer** gap in the agentic commerce protocol
stack — where Visa TAP verifies agent identity, Google UCP handles data
exchange, and Stripe ACP processes payments, but nothing answers whether the
merchant itself is reliable.

## 2. Protocol Stack Position

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent Commerce                     │
├─────────────┬───────────────┬───────────────┬───────────┤
│  Visa TAP   │  Google UCP   │  Stripe ACP   │   OTR     │
│  Agent Auth │  Data Exchange│  Payments     │  Trust    │
│             │               │               │  Layer    │
└─────────────┴───────────────┴───────────────┴───────────┘
```

## 3. Scoring Model

### 3.1 Seven Trust Dimensions

| # | Dimension     | Description                                    |
|---|---------------|------------------------------------------------|
| 1 | Identity      | Who is this merchant? (unforgeable signals)    |
| 2 | Technical     | Is the site technically secure?                |
| 3 | Compliance    | Does the merchant meet regulatory standards?   |
| 4 | PolicyScore   | Are consumer policies complete?                |
| 5 | WebPresence   | Is the website professionally maintained?      |
| 6 | DataQuality   | How good is the product data?                  |
| 7 | Fulfillment   | Can they actually deliver?                     |

### 3.2 Scoring Phases

#### Public Assessment (formerly "Cold Start")

Available for all domains using publicly verifiable data.

| Dimension   | Weight | Rationale                              |
|-------------|--------|----------------------------------------|
| Identity    | 0.55   | Unforgeable signals dominate           |
| Technical   | 0.15   | Easily optimizable, lower weight       |
| PolicyScore | 0.15   | Easily optimizable, lower weight       |
| WebPresence | 0.15   | Easily optimizable, lower weight       |

#### Verified Merchant (formerly "Merchant Authorized")

Available when merchant provides API data (DataQuality/Fulfillment evidence).

| Dimension   | Weight | Rationale                              |
|-------------|--------|----------------------------------------|
| Identity    | 0.15   | Already proven at enrollment           |
| Technical   | 0.05   | Baseline requirement                   |
| Compliance  | 0.10   | Regulatory adherence matters           |
| PolicyScore | 0.05   | Baseline requirement                   |
| WebPresence | 0.05   | Baseline requirement                   |
| DataQuality | 0.25   | Product data quality is critical       |
| Fulfillment | 0.35   | "Will they ship?" is the #1 concern    |

### 3.3 Brand Fast-Track

Major brands with independently verifiable signals receive bonus points:

| Condition                              | Bonus |
|----------------------------------------|-------|
| Stock-listed + Tranco Top 1K + Wikidata| +15   |
| Stock-listed + Tranco Top 1K           | +10   |
| Stock-listed only                      | +10   |
| Tranco Top 1K only                     | +8    |

### 3.4 Badge Assignment

| Badge    | Score Range | Meaning                    |
|----------|-------------|----------------------------|
| PLATINUM | 90-94       | Highest verified trust     |
| GOLD     | 80-89       | Strong trust               |
| SILVER   | 70-79       | Good trust                 |
| BRONZE   | 60-69       | Acceptable trust           |
| UNRATED  | 0-59        | Insufficient evidence      |

Score cap: **94** (scores 95+ reserved for manual review).

### 3.5 Data Confidence Label

A display-only label that does **NOT** affect scoring:

| Label            | Condition        | Meaning                        |
|------------------|------------------|--------------------------------|
| HIGH_CONFIDENCE  | 3+ months data   | Score backed by substantial data|
| LOW_CONFIDENCE   | 1-3 months data  | Limited data backing           |
| INSUFFICIENT     | < 1 month data   | Very limited data              |

## 4. Anti-Gaming Detection

Prevents adversarial optimization of gameable signals.

### Detection Patterns

1. **Signal-Brand Mismatch:** High tech score + no identity = suspicious
2. **Domain Age Gate:** Young domains have capped gameable scores
3. **Perfect Gameable Scores:** Near-perfect tech/policy/web with minimal identity

### Multipliers

Gaming patterns apply multipliers (0.5-0.7) to gameable dimensions
(Technical, PolicyScore, WebPresence) only. Identity, Compliance,
DataQuality, and Fulfillment are never penalized.

## 5. Trust Manifest (trust.json)

Merchants MAY publish a trust manifest at:
```
/.well-known/otr/trust.json
```

### Format

```json
{
  "version": "3.0.0",
  "domain": "example.com",
  "trustScore": 85,
  "badge": "GOLD",
  "dimensions": {
    "identity": 75,
    "technical": 80,
    "compliance": 72,
    "policyScore": 85,
    "webPresence": 70,
    "dataQuality": 90,
    "fulfillment": 95
  },
  "issuedAt": "2026-03-01T00:00:00Z",
  "expiresAt": "2026-04-01T00:00:00Z",
  "issuer": "orbexa.io"
}
```

### Signed Manifests

Manifests MAY be cryptographically signed using ECDSA P-256:

```json
{
  "manifest": { ... },
  "signature": "<base64url-encoded ECDSA signature>",
  "keyId": "orbexa-2026-03"
}
```

## 6. Scoring Independence & Fairness

OTR trust scores are computed using **deterministic, open-source algorithms**
based solely on objective, verifiable data.

1. **No Score Selling** — OTR scores cannot be purchased, influenced, or
   manipulated through any commercial relationship.

2. **No Pay-for-Trust** — Whether a merchant is a SaaS subscriber has NO
   direct impact on their OTR trust score.

3. **No Human Override** — Scores are not subject to manual adjustment or
   editorial influence.

4. **Algorithmic Transparency** — The scoring algorithm is fully open-source
   (MIT License). Anyone can audit, reproduce, and verify any trust score.

5. **No Time-Based Scoring** — Scores are purely behavior-data-driven.
   A merchant with 1 month of excellent data scores the same as one with
   12 months of the same data quality.

## 7. Federation Model (Roadmap)

### Phase 1: Single Validator (Current)
- ORBEXA operates as the sole validator
- Algorithm is open-source for independent verification

### Phase 2: Federated Validators
- Accredited organizations run independent validators
- Validators must pass conformance tests
- Multi-validator consensus (±5 score points) → "confirmed" status

### Phase 3: Open Federation
- Any accredited organization can join
- Governance council with elected representatives
- Deterministic scoring eliminates discretionary divergence

## 8. MCP Server Integration

OTR provides an MCP (Model Context Protocol) server for AI agents:

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

### Available Tools

| Tool              | Description                              |
|-------------------|------------------------------------------|
| verify_merchant   | Verify trust score for a domain          |
| search_registry   | Search the merchant registry             |
| get_refund_policy | Get machine-readable refund policy       |

## 9. Conformance

Implementations MUST produce identical outputs for the standard test vectors
in `conformance/test-vectors.json`. The conformance test runner validates:

- Phase detection (Public Assessment vs Verified Merchant)
- All 7 dimension scores
- Fast-Track bonus calculation
- Composite score
- Badge and tier assignment

## 10. References

- [OTR Scoring Algorithm v3](./SCORING-ALGORITHM-v3.md)
- [Trust Manifest Schema](./TRUST-MANIFEST.schema.json)
- [Anti-Fraud Framework](./ANTI-FRAUD-FRAMEWORK.md)
- [Federation Specification](./FEDERATION.md)
