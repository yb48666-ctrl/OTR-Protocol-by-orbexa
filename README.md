<p align="center">
  <img src="https://raw.githubusercontent.com/yb48666-ctrl/OTR-Protocol-by-orbexa/main/assets/otr-logo.svg" alt="OTR Protocol" width="80" />
</p>

<h1 align="center">OTR Protocol</h1>

<p align="center">
  <strong>The merchant trust layer for AI agent commerce</strong><br>
  <em>Deterministic, verifiable, open-source merchant trust scoring for the agentic economy</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@otr-protocol/core"><img src="https://img.shields.io/npm/v/@otr-protocol/core.svg?style=flat-square&color=22D3EE" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/yb48666-ctrl/OTR-Protocol-by-orbexa/stargazers"><img src="https://img.shields.io/github/stars/yb48666-ctrl/OTR-Protocol-by-orbexa?style=flat-square&color=yellow" alt="GitHub Stars" /></a>
  <a href="https://github.com/yb48666-ctrl/OTR-Protocol-by-orbexa/issues"><img src="https://img.shields.io/github/issues/yb48666-ctrl/OTR-Protocol-by-orbexa?style=flat-square" alt="Issues" /></a>
</p>

<p align="center">
  <a href="spec/OTR-SPEC-v3.md">Specification</a> &bull;
  <a href="spec/SCORING-ALGORITHM-v3.md">Scoring Algorithm</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#packages">Packages</a> &bull;
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## The Problem

AI agents are increasingly making purchase decisions on behalf of consumers. The agentic commerce stack is taking shape -- but there is a critical missing layer:

```
┌──────────────────────────────────────────────────────────────────┐
│                  AI Agent Commerce Protocol Stack                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Visa TAP ·············· Agent Identity Verification             │
│   Google UCP ············ Structured Data Exchange                 │
│   Stripe ACP ············ Payment Processing                      │
│                                                                   │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │  OTR Protocol ·····  MERCHANT TRUST VERIFICATION  ◀━━━━━ │   │
│   │                      "Is this merchant safe to buy from?" │   │
│   └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│   Visa TAP answers "Who is the AI agent?"                         │
│   Google UCP answers "What products are available?"               │
│   Stripe ACP answers "How do I pay?"                              │
│   OTR answers "Should I trust this merchant?"  ◀━━ ONLY OTR      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

Without OTR, AI agents operate blind -- unable to distinguish a legitimate retailer from a sophisticated scam site. This exposes consumers to fraud and erodes trust in the entire agentic commerce ecosystem.

## The Solution

**OTR (Open Trust Registry)** provides deterministic, verifiable merchant trust scores using **7 verification dimensions**, a **9-layer anti-fraud engine**, and **three-layer immutable audit trail**. It is fully open-source (MIT), machine-readable, and designed from the ground up for AI agent consumption.

### Key Properties

- **Deterministic** -- Same inputs always produce identical outputs. Any validator can reproduce any score.
- **Verifiable** -- All data sources are publicly accessible. No hidden factors or proprietary signals.
- **Unforgeable** -- Identity dimension weighted at 55% in public assessment. SEC filings, Wikidata entries, and 10-year domain age cannot be faked.
- **Tamper-proof** -- SHA-256 hash chain + Base L2 blockchain anchoring + IPFS monthly snapshots.
- **Fair** -- No pay-for-trust. Scores reflect behavior, not subscription level.

## Quick Start

```bash
# Verify any merchant instantly
npx @otr-protocol/validator verify nike.com

# Output:
# ┌─────────────────────────────────────────┐
# │  nike.com                        GOLD   │
# │  Trust Score: 88/94                     │
# │                                         │
# │  Identity:      85  ██████████████░░    │
# │  Technical:     80  █████████████░░░    │
# │  Compliance:    72  ████████████░░░░    │
# │  Policy:        75  ████████████░░░░    │
# │  Web Presence:  82  █████████████░░░    │
# │  Data Quality:  --  (requires merchant) │
# │  Fulfillment:   --  (requires merchant) │
# └─────────────────────────────────────────┘
```

### For AI Agents (MCP Server)

The OTR MCP Server uses the standard [Model Context Protocol](https://modelcontextprotocol.io) and works with **all MCP-compatible clients**.

**Claude Desktop / Claude Code** -- add to `claude_desktop_config.json`:

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

**Cursor / Windsurf / Cline** -- same configuration in `.cursor/mcp.json` or equivalent. Any client implementing the MCP specification works out of the box.

Now any AI agent can verify merchants in natural language:

> *"Is nike.com trustworthy?"* --> OTR returns trust score 88, badge GOLD, and a 7-dimension breakdown with evidence sources.

### Three MCP Tools

| Tool | Description | Example |
|------|-------------|---------|
| `verify_merchant` | Full trust report for a domain | `verify_merchant({ domain: "nike.com" })` |
| `search_registry` | Search the OTR merchant registry | `search_registry({ query: "nike", limit: 10 })` |
| `get_refund_policy` | Machine-readable refund policy | `get_refund_policy({ domain: "nike.com" })` |

### TypeScript SDK

```typescript
import { OtrClient } from "@otr-protocol/sdk";

const otr = new OtrClient();
const result = await otr.verify("nike.com");

console.log(result.trustScore);   // 88
console.log(result.badge);        // "GOLD"
console.log(result.dimensions);   // { identity: 85, technical: 80, ... }

// Search the registry
const results = await otr.search("electronics", { minScore: 70 });
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
  domainAgeYears: 15,
  // ... 40+ evidence fields
});

console.log(result.trustScore);  // 88
console.log(result.badge);       // "GOLD"
console.log(result.tier);        // "TIER_4"
```

## Architecture

```
                         ┌─────────────────────────────────┐
                         │       AI Agent / Application      │
                         │   "Should I buy from example.com?" │
                         └──────────────┬──────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                    │
              ┌─────▼─────┐     ┌──────▼──────┐    ┌──────▼──────┐
              │ MCP Server │     │  REST API   │    │   SDK       │
              │  (stdio)   │     │  /api/otr   │    │  npm pkg    │
              └─────┬──────┘     └──────┬──────┘    └──────┬──────┘
                    │                   │                    │
                    └───────────────────┼───────────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │      OTR Scoring Engine       │
                         │   @otr-protocol/core          │
                         │                               │
                         │  ┌─────────────────────────┐  │
                         │  │ 7 Dimension Evaluators   │  │
                         │  │ Identity | Technical     │  │
                         │  │ Compliance | Policy      │  │
                         │  │ Web | DataQuality | Ship │  │
                         │  └─────────────────────────┘  │
                         │  ┌─────────────────────────┐  │
                         │  │ 9-Layer Anti-Fraud       │  │
                         │  │ Domain Age | SSL | DNS   │  │
                         │  │ Pattern | Tranco | ...   │  │
                         │  └─────────────────────────┘  │
                         │  ┌─────────────────────────┐  │
                         │  │ Brand Fast-Track         │  │
                         │  │ SEC + Tranco + Wikidata  │  │
                         │  └─────────────────────────┘  │
                         └──────────────┬──────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                          │
     ┌────────▼────────┐    ┌──────────▼──────────┐    ┌─────────▼─────────┐
     │  Public Data     │    │  Merchant Bridge     │    │  Immutable Audit   │
     │  Sources         │    │  (Verified Only)     │    │  Trail             │
     │                  │    │                      │    │                    │
     │  SEC EDGAR       │    │  Product Catalog     │    │  SHA-256 Hash      │
     │  Wikidata        │    │  Order Data (agg)    │    │  Chain             │
     │  Tranco List     │    │  Delivery Metrics    │    │  Base L2 Anchoring │
     │  DNS Records     │    │  Tracking Numbers    │    │  IPFS Snapshots    │
     │  SSL Certs       │    │  (desensitized)      │    │                    │
     │  crt.sh          │    │                      │    │                    │
     └─────────────────┘    └──────────────────────┘    └───────────────────┘
```

## How Scoring Works

### 7 Trust Dimensions

| # | Dimension | Weight (Public) | Weight (Verified) | What It Measures |
|---|-----------|:-:|:-:|------------------|
| 1 | **Identity** | **0.55** | 0.15 | SEC filings, stock exchange, Wikidata, domain age, Tranco rank |
| 2 | **Technical** | 0.15 | 0.05 | SSL/TLS, DMARC, SPF, DKIM, HSTS, CAA, security.txt |
| 3 | **Compliance** | -- | 0.10 | GDPR, CCPA, PCI-DSS, industry-specific compliance |
| 4 | **Policy** | 0.15 | 0.05 | Privacy policy, refund policy, terms of service, cookies |
| 5 | **Web Presence** | 0.15 | 0.05 | robots.txt, Schema.org, AI crawler support, llms.txt |
| 6 | **Data Quality** | -- | **0.25** | Product catalog, pricing, inventory, structured data |
| 7 | **Fulfillment** | -- | **0.35** | Delivery speed, return window, tracking, shipping policy |

**Why Identity = 0.55 in Public Assessment?** Because it measures unforgeable signals. A scam site can deploy perfect SSL/DMARC/HSTS (technical), generate policy pages (policy), and build a professional-looking site (web presence) -- but it cannot fake a NYSE listing, a 15-year domain history, or a Wikidata entry with thousands of edits.

**Why Fulfillment = 0.35 in Verified Assessment?** Because "will they actually deliver?" is the #1 concern for AI agents making purchases. When a merchant provides API access, real fulfillment data becomes available and dominates the score.

### Two Scoring Phases

```
Phase 1: Public Assessment (no merchant cooperation needed)
═══════════════════════════════════════════════════════════
  Identity (0.55) + Technical (0.15) + Policy (0.15) + Web (0.15) = Score

  Nike (public):   Identity=85 × 0.55 + Tech=80 × 0.15 + ...  = 83 GOLD
  Scam site:       Identity=10 × 0.55 + Tech=100 × 0.15 + ... = 39 UNRATED
                                                                   ↑ can't game Identity


Phase 2: Verified Merchant (merchant provides API access)
═══════════════════════════════════════════════════════════
  Fulfillment (0.35) + DataQuality (0.25) + Identity (0.15) + Compliance (0.10)
  + Technical (0.05) + Policy (0.05) + Web (0.05) = Score

  Good merchant:   Fulfill=90 × 0.35 + DQ=85 × 0.25 + ...  = 78 SILVER
  Bad merchant:    Fulfill=30 × 0.35 + DQ=40 × 0.25 + ...  = 38 UNRATED
                                                                  ↑ bad fulfillment = low score
                                                                    regardless of subscription
```

### Trust Badges

| Badge | Score | AI Agent Action |
|-------|:-----:|-----------------|
| **PLATINUM** | 90-94 | Auto-recommend + auto-purchase |
| **GOLD** | 80-89 | Recommend with merchant info displayed |
| **SILVER** | 70-79 | Show products, require user confirmation to buy |
| **BRONZE** | 60-69 | Display only, warn against auto-purchase |
| **UNRATED** | 0-59 | Warning: insufficient trust signals |

> Scores are capped at **94**. The 95-100 range is reserved for future multi-validator consensus confirmation.

## 9-Layer Anti-Fraud Engine

OTR v3 prevents fraudulent sites from gaming the system through a 9-layer detection pipeline:

```
Layer 1  Domain Age          Certificate history analysis (crt.sh)
Layer 2  SSL Security        HTTPS/HSTS verification, self-signed detection
Layer 3  DNS Security        DMARC, SPF, DKIM policy completeness
Layer 4  Domain Pattern      Brand impersonation (amaz0n-deals.xyz), suspicious TLDs
Layer 5  Tranco Rank         Independent traffic ranking verification
Layer 6  Content Analysis    Phishing keywords, parked domains, empty pages
Layer 7  Redirect Chain      Cross-domain redirect detection
Layer 8  Cross-Signal        Multi-signal correlation and accumulation rules
Layer 9  Anti-Gaming         Signal-brand mismatch, time clustering, template detection
         ▼
         Single CRITICAL signal = immediate rejection
         Fraud score > 30 = rejection
         Anti-gaming multiplier applied to gameable dimensions
```

### Anti-Gaming in Practice

| Scenario | Old v2 Score | New v3 Score | Change |
|----------|:----:|:----:|:------:|
| Nike (legitimate brand) | 79 SILVER | 88 GOLD | +9 |
| Scam site (perfect tech) | 68 BRONZE | 39 UNRATED | -29 |
| Scam site + anti-gaming | -- | 28 UNRATED | blocked |

## Data Integrity

OTR uses a three-layer immutable audit trail to ensure that historical scores cannot be tampered with:

```
Layer 1: PostgreSQL Hash Chain (real-time, $0/year)
├── Every score change records SHA-256 hash
├── Each record links to previous via prev_hash
├── Any modification breaks the chain → detectable
└── verifyChainIntegrity() → instant verification

Layer 2: Base L2 Blockchain Anchoring (daily, ~$0.37/year)
├── Daily chain-head hash written to Base L2 smart contract
├── Externally verifiable by anyone
├── AWS KMS hardware security for signing keys
└── Transaction hash stored in otr_l2_anchors table

Layer 3: IPFS Monthly Snapshots (monthly, $0/year via web3.storage)
├── Full registry exported as content-addressed JSON
├── CID (Content Identifier) is immutable
├── Anyone can retrieve and verify the snapshot
└── CIDs recorded in otr_snapshots table
```

**Public Verification Endpoints:**
```
GET /api/otr/audit/chain-integrity     Verify hash chain completeness
GET /api/otr/verify/:domain/history    Score history with trend data
GET /api/otr/audit/l2-anchors          Base L2 anchoring records
GET /api/otr/audit/snapshots           IPFS snapshot CID listing
```

## Multi-Source Consensus

OTR never blindly trusts any single data source. Every external data point must pass cross-validation:

```
Source Weights (not all sources are equally trustworthy):
  sec.gov           1.0   Government source → highest trust
  dns-query         0.9   Infrastructure → high trust
  tranco-list.eu    0.9   Academic source → high trust
  wikidata.org      0.8   Community source → high but editable
  finnhub.io        0.7   Commercial API → moderate-high trust
  website-scan      0.6   Self-reported → moderate trust
  merchant-api      0.4   Merchant-declared → low trust (can be faked)

Consensus Rules:
  ✓ 2+ sources agree → accepted (high confidence)
  ✗ Sources disagree → rejected (keep existing value)
  ⚠ Single source drift > 30% → anomaly flagged
  🔒 3+ anomalies from one source → auto-quarantine
```

## Data Desensitization

When merchants provide fulfillment data, OTR applies 4 levels of privacy protection:

| Level | Stage | What Happens |
|:-----:|-------|--------------|
| L1 | Pre-transmission | Customer names → SHA-256 hash, addresses → country+city only, emails/phones/payments → deleted |
| L2 | In transit | TLS 1.3 + HMAC-SHA256 signature + nonce anti-replay |
| L3 | Server-side | Instant aggregation to statistics, raw data never persists |
| L4 | Audit trail | Only metadata logged (timestamps, counts), never content |

## Why OTR?

| Feature | OTR | Trustpilot | BBB | Google Merchant |
|---------|:---:|:---:|:---:|:---:|
| AI-native API (MCP Server) | **Yes** | No | No | No |
| Deterministic scoring | **Yes** | No | No | No |
| Open-source algorithm (MIT) | **Yes** | No | No | No |
| No pay-for-trust | **Yes** | No | No | Yes |
| Multi-source verification | **7 dimensions** | 1 (stars) | 1 (grade) | Partial |
| Anti-gaming detection | **9-layer** | No | No | No |
| Machine-readable output | **Full JSON** | Partial | No | Partial |
| Immutable audit trail | **3-layer** | No | No | No |
| Federation-ready | **Yes** | No | No | No |
| Conformance test suite | **Yes** | N/A | N/A | N/A |
| Data desensitization | **4-level** | N/A | N/A | Partial |

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@otr-protocol/core`](packages/core) | Deterministic scoring engine -- the reference implementation | [![npm](https://img.shields.io/npm/v/@otr-protocol/core.svg?style=flat-square)](https://www.npmjs.com/package/@otr-protocol/core) |
| [`@otr-protocol/mcp-server`](packages/mcp-server) | MCP Server for AI agents (Claude, Cursor, Windsurf, Cline) | [![npm](https://img.shields.io/npm/v/@otr-protocol/mcp-server.svg?style=flat-square)](https://www.npmjs.com/package/@otr-protocol/mcp-server) |
| [`@otr-protocol/validator`](packages/validator-cli) | CLI tool for merchant verification | [![npm](https://img.shields.io/npm/v/@otr-protocol/validator.svg?style=flat-square)](https://www.npmjs.com/package/@otr-protocol/validator) |
| [`@otr-protocol/sdk`](packages/sdk) | TypeScript client SDK for application integration | [![npm](https://img.shields.io/npm/v/@otr-protocol/sdk.svg?style=flat-square)](https://www.npmjs.com/package/@otr-protocol/sdk) |

## Conformance Testing

Any OTR implementation must pass the standard conformance test vectors:

```bash
npm run conformance
```

The test suite validates **determinism**: identical inputs produce identical outputs across all implementations (TypeScript, Python, Go, Rust). This ensures a merchant's trust score is the same regardless of which validator computed it.

Test vectors in [`conformance/test-vectors.json`](conformance/test-vectors.json) cover:
- Phase detection (Public Assessment vs. Verified Merchant)
- Individual dimension scoring
- Fast-track bonus calculation
- Badge and tier assignment
- Anti-gaming detection and penalty application
- Edge cases (empty data, null fields, boundary values)

## Scoring Fairness Statement

OTR Protocol maintains the integrity and independence of merchant trust scores through these commitments:

1. **No Score Selling** -- Trust scores cannot be purchased, sponsored, or commercially influenced.
2. **No Pay-for-Trust** -- Subscription status has zero impact on OTR scores. Free-tier merchants receive identical scoring treatment.
3. **No Human Override** -- All scores are computed algorithmically. No individual can manually adjust any score.
4. **Algorithmic Transparency** -- The entire algorithm is open-source (MIT). Anyone can audit, verify, and reproduce any score.
5. **Data-Driven Only** -- Scores reflect independently verifiable signals. Integration time, partnership status, and non-behavioral factors have no influence.

**Enforcement:** Open-source code + conformance tests + governance process + federation model (roadmap).

## Roadmap

| Phase | Status | Description |
|-------|:------:|-------------|
| Phase 1 | **Complete** | Open-source scoring engine, MCP Server, CLI, SDK, conformance tests |
| Phase 2 | **In Progress** | Hash chain integrity, L2 anchoring, IPFS snapshots, logistics audit, multi-source consensus, data desensitization, score decay |
| Phase 3 | Planned | Federated trust validation (Certificate Transparency model), multi-validator consensus, trust.json cryptographic signatures |
| Phase 4 | Planned | IETF Internet-Draft standardization, Python/Go SDKs, academic paper |

## Federation Vision

OTR is designed to evolve from a single-validator system to a federated trust network:

```
Phase 1-2 (Current):  Single validator (ORBEXA)
Phase 3:              Multiple independent validators
                      ┌─────────────────────┐
                      │  OTR Governance      │
                      │  Council             │
                      └─────┬───────────┬────┘
                            │           │
                    ┌───────▼──┐  ┌─────▼──────┐
                    │ Validator │  │ Validator   │  ...
                    │ A (ORBEXA)│  │ B (Academic)│
                    └───────┬──┘  └─────┬──────┘
                            │           │
                    Same open-source algorithm
                    Same inputs → Same outputs
                    Signed assessments → Append-only log
                    3+ validators agree → "confirmed" status
Phase 4:              IETF standardization
```

Key design decisions inspired by:
- **Certificate Transparency** -- Multiple independent logs prevent any single point of trust
- **Tranco** -- 5 independent data sources with Dowdall aggregation for manipulation resistance
- **DMARC/SPF/DKIM** -- DNS-based self-publishing enables independent verification

## Contributing

We welcome contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

**Key requirements for scoring algorithm changes:**
1. RFC-style proposal in `spec/`
2. Updated conformance test vectors
3. Determinism verification
4. Review by maintainers

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

<p align="center">
  <sub>Built by <a href="https://orbexa.io">ORBEXA</a> -- Infrastructure for Agentic Commerce</sub>
</p>
