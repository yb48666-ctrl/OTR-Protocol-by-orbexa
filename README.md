<p align="center">
  <img src="https://raw.githubusercontent.com/yb48666-ctrl/OTR-Protocol/main/assets/otr-logo.svg" alt="OTR Protocol" width="80" />
</p>

<h1 align="center">OTR Protocol</h1>

<p align="center">
  <strong>The merchant trust layer for AI agent commerce</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/version-3.0.0-22D3EE.svg?style=flat-square" alt="v3.0.0" />
  <a href="https://github.com/yb48666-ctrl/OTR-Protocol/stargazers"><img src="https://img.shields.io/github/stars/yb48666-ctrl/OTR-Protocol?style=flat-square&color=yellow" alt="GitHub Stars" /></a>
  <a href="https://github.com/yb48666-ctrl/OTR-Protocol/issues"><img src="https://img.shields.io/github/issues/yb48666-ctrl/OTR-Protocol?style=flat-square" alt="Issues" /></a>
</p>

<p align="center">
  <a href="https://github.com/yb48666-ctrl/OTR-Protocol/tree/main/spec/OTR-SPEC-v3.md">Specification</a> &bull;
  <a href="https://github.com/yb48666-ctrl/OTR-Protocol/tree/main/spec/SCORING-ALGORITHM-v3.md">Scoring Algorithm</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#packages">Packages</a> &bull;
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## The Problem

AI agents are increasingly making purchase decisions on behalf of consumers. The agentic commerce stack is taking shape:

- **Visa TAP** verifies the AI agent's identity
- **Google UCP** handles structured data exchange
- **Stripe ACP** processes payments

But **no protocol answers the critical question: "Is this merchant trustworthy? Is it safe for an AI agent to recommend?"**

Without a standardized trust layer, AI agents operate blind -- unable to distinguish a legitimate retailer from a sophisticated scam site. This erodes consumer confidence and exposes the entire agentic commerce ecosystem to fraud risk.

```
┌─────────────────────────────────────────────────────┐
│              AI Agent Commerce Stack                 │
├─────────────────────────────────────────────────────┤
│  Visa TAP            Agent Identity                 │
│  Google UCP          Data Exchange                  │
│  Stripe ACP          Payment Processing             │
│  OTR Protocol   >>>  Merchant Trust  <<<            │
└─────────────────────────────────────────────────────┘
```

## The Solution

**OTR (Open Trust Registry) Protocol** provides deterministic, verifiable merchant trust scores using **7 verification dimensions** and **9-layer anti-fraud detection**. It is fully open-source, machine-readable, and designed from the ground up for AI agent consumption.

OTR scores are computed from independently verifiable public data -- stock exchange filings, DNS records, Wikidata entries, domain age, policy pages, and more. No human override. No pay-for-trust. Same inputs always produce the same outputs.

## Quick Start

```bash
# Verify any merchant from the command line
npx @otr-protocol/validator verify nike.com

# Start the MCP Server for Claude Desktop / AI agents
npx @otr-protocol/mcp-server

# Install the TypeScript SDK in your project
npm install @otr-protocol/sdk
```

### MCP Server (Claude Desktop / AI Agents)

Add to your `claude_desktop_config.json`:

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

Now any AI agent can verify merchants in natural language:

> "Is nike.com trustworthy?" --> OTR returns score 88, badge GOLD, 7-dimension breakdown

### TypeScript SDK

```typescript
import { OtrClient } from "@otr-protocol/sdk";

const otr = new OtrClient();
const result = await otr.verify("nike.com");

console.log(result.trustScore);   // 88
console.log(result.badge);        // "GOLD"
console.log(result.dimensions);   // { identity: 65, technical: 75, ... }
```

### Core Scoring Engine

```typescript
import { calculateTrustScore } from "@otr-protocol/core";

// Deterministic: same inputs always produce identical outputs
const result = calculateTrustScore({
  hasSecFiling: true,
  hasStockSymbol: true,
  stockExchange: "NYSE",
  hasWikidataId: true,
  trancoRank: 500,
  // ... 40+ evidence fields
});

console.log(result.trustScore);  // 88
console.log(result.badge);       // "GOLD"
console.log(result.tier);        // "TIER_4"
```

## How It Works

OTR evaluates merchants across **7 trust dimensions**, each measuring a different facet of trustworthiness:

| # | Dimension | What It Measures | Key Signals |
|---|-----------|------------------|-------------|
| 1 | **Identity** | Is this a real, established business? | SEC filings, stock exchange, Wikidata, corporate registry, domain age, Tranco rank |
| 2 | **Technical** | Does the site follow security best practices? | SSL/TLS type, DMARC, SPF, DKIM, HSTS, CAA, security.txt, MTA-STS |
| 3 | **Compliance** | Does the business meet regulatory standards? | Industry-specific compliance verification |
| 4 | **Policy** | Are consumer protections in place? | Privacy policy (GDPR/CCPA), refund policy, terms of service, cookie consent |
| 5 | **Web Presence** | Is this a professional, well-maintained site? | robots.txt, sitemap, Schema.org, multi-language, mobile support |
| 6 | **Data Quality** | Can AI agents get structured product data? | Product catalog, pricing, inventory sync, rich media, structured data |
| 7 | **Fulfillment** | Will they actually deliver? | Shipping policy, return window, delivery speed, order tracking |

### Two Scoring Phases

**Public Assessment** -- No merchant cooperation needed. Evaluates publicly available signals with Identity weighted at **0.55** to prevent gaming:

```
Identity (0.55) + Technical (0.15) + Policy (0.15) + Web Presence (0.15) = Score (0-94)
```

**Verified Merchant** -- Merchant provides API access. Fulfillment becomes dominant at **0.35** because "will they actually ship?" is an AI agent's top concern:

```
Fulfillment (0.35) + Data Quality (0.25) + Identity (0.15) + Compliance (0.10)
+ Technical (0.05) + Policy (0.05) + Web Presence (0.05) = Score (0-94)
```

### Trust Badges

| Badge | Score Range | Meaning |
|-------|------------|---------|
| PLATINUM | 90-94 | Exceptional trust across all dimensions |
| GOLD | 80-89 | Strong trust, recommended for AI agents |
| SILVER | 70-79 | Good trust with some gaps |
| BRONZE | 60-69 | Basic trust, proceed with caution |
| UNRATED | 0-59 | Insufficient trust signals |

> Scores are capped at 94. The 95-100 range is reserved for future manual review processes.

## Why OTR?

| Feature | OTR Protocol | Trustpilot | BBB | Google Merchant Center |
|---------|:---:|:---:|:---:|:---:|
| AI-native API (MCP Server) | **Yes** | No | No | No |
| Deterministic scoring | **Yes** | No | No | No |
| Open-source algorithm | **Yes (MIT)** | No | No | No |
| No pay-for-trust | **Yes** | No | No | Yes |
| Multi-source verification | **Yes (7 dimensions)** | No (1: stars) | No (1: grade) | Partial |
| Anti-gaming detection | **Yes (9-layer)** | No | No | No |
| Machine-readable output | **Yes (JSON)** | Partial | No | Partial |
| Federation-ready | **Yes** | No | No | No |
| Conformance test suite | **Yes** | N/A | N/A | N/A |

## Anti-Gaming Protection

OTR v3 prevents fraudulent sites from inflating scores by optimizing easily gameable signals. The system detects adversarial patterns and applies penalties:

```
                       Old v2 Weights          New v3 Weights
Legitimate brand:      79.8 (SILVER)   -->     88 (GOLD)    [up]
Gaming site:           68.5 (BRONZE!)  -->     39 (UNRATED) [down]
+ with anti-gaming:    --              -->     28 (UNRATED) [down]
```

**Detection patterns include:**

- **Signal-Brand Mismatch** -- Perfect technical scores with no verifiable brand identity
- **Domain Age Gate** -- Young domains have capped gameable dimension scores
- **Perfect Gameable Scores** -- Near-perfect tech/policy/web with minimal identity signals
- **Template Detection** -- Policy pages matching known template fingerprints

Identity weight (0.55) makes unforgeable signals dominant. Gaming sites cannot fake stock exchange listings, Wikidata entries, SEC filings, or 10+ year domain age.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@otr-protocol/core`](packages/core) | Deterministic scoring engine -- the reference implementation | `3.0.0` |
| [`@otr-protocol/mcp-server`](packages/mcp-server) | MCP Server for Claude Desktop and AI agents | `3.0.0` |
| [`@otr-protocol/validator`](packages/validator-cli) | CLI tool for merchant verification | `3.0.0` |
| [`@otr-protocol/sdk`](packages/sdk) | TypeScript client SDK for application integration | `3.0.0` |

## Conformance Testing

Any OTR implementation -- in any language -- must pass the standard conformance test vectors to be considered compliant:

```bash
npm run conformance
```

The test suite validates **determinism**: identical inputs must produce identical outputs across all implementations (TypeScript, Python, Go, Rust, etc.). This ensures that a merchant's trust score is the same regardless of which validator computed it.

Test vectors are defined in [`conformance/test-vectors.json`](conformance/test-vectors.json) and cover:
- Phase detection (Public Assessment vs. Verified Merchant)
- Individual dimension scoring
- Fast-track bonus calculation
- Badge and tier assignment
- Anti-gaming detection and penalty application

## OTR Scoring Fairness Statement

OTR Protocol is committed to maintaining the integrity and independence of merchant trust scores. We make the following commitments to the community:

### 1. No Score Selling
Trust scores cannot be purchased, sponsored, or commercially influenced. There is no premium tier, advertising product, or business relationship that can increase a merchant's OTR score.

### 2. No Pay-for-Trust
Whether a merchant subscribes to ORBEXA's SaaS platform has **zero impact** on their OTR trust score. A merchant using the free tier receives the exact same scoring treatment as an enterprise subscriber.

### 3. No Human Override
All scores are computed algorithmically from verifiable data. No individual -- including ORBEXA employees, investors, or partners -- can manually adjust, override, or influence a specific merchant's score.

### 4. Algorithmic Transparency
The entire scoring algorithm is open-source under the MIT license. Anyone can audit the code, verify the logic, propose improvements, and run their own independent validator. There are no secret weights, hidden factors, or proprietary adjustments.

### 5. Data-Driven Only
Scores reflect independently verifiable signals: SEC filings, DNS records, Wikidata entries, domain registration, policy pages, and structured data availability. Scores are not influenced by integration time, partnership status, or any non-behavioral factor.

### Enforcement
These commitments are enforced through:
- **Open-source code** -- Anyone can verify that the algorithm matches these principles
- **Conformance tests** -- Standard test vectors ensure deterministic behavior
- **Governance process** -- Any change to scoring weights requires a public RFC and community review
- **Federation model** -- Multiple independent validators will cross-check scores (roadmap)

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | **Current** | Open-source scoring engine, MCP Server, CLI, SDK |
| Phase 2 | Planned | Logistics audit, data desensitization, hash chain integrity |
| Phase 3 | Planned | Federated trust validation (Certificate Transparency model) |
| Phase 4 | Planned | IETF Internet-Draft standardization |

## Contributing

We welcome contributions from the community. See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

**Key requirements for scoring algorithm changes:**
1. RFC-style proposal in `spec/`
2. Updated conformance test vectors
3. Determinism verification
4. Review by maintainers

## Governance

OTR Protocol follows an open governance model to ensure scoring independence and prevent capture by any single entity. See [GOVERNANCE.md](GOVERNANCE.md) for details.

## License

[MIT](LICENSE) -- ORBEXA

---

<p align="center">
  <a href="spec/OTR-SPEC-v3.md">Protocol Specification</a> &bull;
  <a href="spec/SCORING-ALGORITHM-v3.md">Scoring Algorithm</a> &bull;
  <a href="GOVERNANCE.md">Governance Model</a> &bull;
  <a href="CONTRIBUTING.md">Contributing Guide</a> &bull;
  <a href="CODE_OF_CONDUCT.md">Code of Conduct</a>
</p>
