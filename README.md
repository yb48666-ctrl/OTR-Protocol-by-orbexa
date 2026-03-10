# OTR Protocol

**Open Trust Registry — Merchant Trust Verification for AI Agent Commerce**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm @otr-protocol/core](https://img.shields.io/npm/v/@otr-protocol/core.svg)](https://www.npmjs.com/package/@otr-protocol/core)

---

## The Problem

AI agents are making purchase decisions on behalf of consumers. But **no protocol answers: "Is this merchant trustworthy?"**

- **Visa TAP** verifies the AI agent's identity
- **Google UCP** handles data exchange
- **Stripe ACP** processes payments
- **OTR** → fills the **merchant trust gap**

Without OTR, AI agents have no standardized way to assess whether a merchant is legitimate, reducing consumer confidence and increasing fraud risk.

## What is OTR?

OTR is a **deterministic, open-source trust scoring protocol** that evaluates merchants across 7 dimensions:

```
┌────────────────────────────────────────────────────────────┐
│                    OTR Trust Score (0-94)                   │
├────────────┬────────────┬────────────┬────────────┬────────┤
│  Identity  │ Technical  │ Compliance │   Policy   │  Web   │
│    0.55    │    0.15    │    0.00    │    0.15    │  0.15  │
│ (unforgeable│  (DNS/SSL) │ (regulated)│  (scanned) │(site)  │
│  signals)  │            │            │            │        │
└────────────┴────────────┴────────────┴────────────┴────────┘
        Public Assessment Phase (no merchant API needed)

┌────────────────────────────────────────────────────────────┐
│                 Verified Merchant Phase                     │
├──────┬──────┬──────┬──────┬──────┬──────────┬─────────────┤
│ ID   │ Tech │Compl │Policy│ Web  │DataQuality│ Fulfillment │
│ 0.15 │ 0.05 │ 0.10 │ 0.05 │ 0.05 │   0.25   │    0.35    │
│      │      │      │      │      │          │ (top concern│
│      │      │      │      │      │          │  for agents)│
└──────┴──────┴──────┴──────┴──────┴──────────┴─────────────┘
```

## Quick Start

### MCP Server (for Claude Desktop / AI Agents)

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

Now your AI agent can verify any merchant:

> "Is nike.com trustworthy?" → OTR returns score 88, badge GOLD, 7-dimension breakdown

### CLI Validator

```bash
npx @otr-protocol/validator verify nike.com
```

### TypeScript SDK

```typescript
import { OtrClient } from "@otr-protocol/sdk";

const otr = new OtrClient();
const result = await otr.verify("nike.com");

console.log(result.trustScore);  // 88
console.log(result.badge);       // "GOLD"
console.log(result.dimensions);  // { identity: 65, technical: 75, ... }
```

### Core Scoring Engine

```typescript
import { calculateTrustScore } from "@otr-protocol/core";

// Deterministic: same inputs → same outputs, always
const result = calculateTrustScore({
  hasSecFiling: true,
  hasStockSymbol: true,
  stockExchange: "NYSE",
  hasWikidataId: true,
  trancoRank: 500,
  // ... 40+ evidence fields
});
```

## Why OTR?

| Feature | OTR | Trustpilot | BBB | Google MCtr |
|---------|-----|------------|-----|-------------|
| Open source algorithm | **Yes (MIT)** | No | No | No |
| Deterministic scoring | **Yes** | No | No | No |
| No pay-for-trust | **Yes** | No | No | N/A |
| AI agent integration (MCP) | **Yes** | No | No | No |
| 7-dimension breakdown | **Yes** | 1 (stars) | 1 (grade) | Limited |
| Anti-gaming detection | **Yes** | No | No | No |
| Federated validation (roadmap) | **Yes** | No | No | No |

## Scoring Independence & Fairness

OTR trust scores are computed using **deterministic, open-source algorithms**
based solely on objective, verifiable data. We commit to:

1. **No Score Selling** — Scores cannot be purchased or commercially influenced
2. **No Pay-for-Trust** — SaaS subscription status has NO impact on trust scores
3. **No Human Override** — All scores are algorithmically computed, no manual adjustments
4. **Algorithmic Transparency** — Fully open-source (MIT), anyone can audit and verify
5. **Behavior-Data Only** — Scores reflect verifiable signals, not integration time

## Packages

| Package | Description |
|---------|-------------|
| [`@otr-protocol/core`](packages/core) | Deterministic scoring engine |
| [`@otr-protocol/mcp-server`](packages/mcp-server) | MCP Server for AI agents |
| [`@otr-protocol/validator`](packages/validator-cli) | CLI verification tool |
| [`@otr-protocol/sdk`](packages/sdk) | TypeScript client SDK |

## Anti-Gaming Protection

OTR v3 prevents fraudulent sites from gaming the scoring algorithm:

```
                       Old v2 Weights          New v3 Weights
Legitimate brand:      79.8 (SILVER)   →      88 (GOLD) ↑
Gaming site:           68.5 (BRONZE!)  →      39 (UNRATED) ↓
+ with anti-gaming:    —               →      28 (UNRATED) ↓↓
```

Identity weight (0.55) makes unforgeable signals dominant. Gaming sites
can't fake stock exchange listings, Wikidata entries, or 10+ year domain age.

## Conformance Testing

Any OTR implementation must pass the standard test vectors:

```bash
npm run conformance
```

The test suite validates determinism: identical inputs must produce identical
outputs across all implementations (TypeScript, Python, Go, etc.).

## Roadmap

- **Phase 1 (Current):** Open-source scoring engine + MCP Server + CLI
- **Phase 2:** Logistics audit, data desensitization, hash chain integrity
- **Phase 3:** Federated trust validation (Certificate Transparency model)
- **Phase 4:** IETF Internet-Draft standardization

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Changes to the scoring algorithm require:
1. RFC-style proposal in `spec/`
2. Updated conformance test vectors
3. Determinism verification
4. Review by maintainers

## License

[MIT](LICENSE) — ORBEXA

## Links

- [Protocol Specification](spec/OTR-SPEC-v3.md)
- [Scoring Algorithm](spec/SCORING-ALGORITHM-v3.md)
- [Governance Model](GOVERNANCE.md)
