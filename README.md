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

**OTR (Open Trust Registry)** provides deterministic, verifiable merchant trust scores using **6 verification dimensions**, a **10-layer anti-fraud engine**, and **three-layer immutable audit trail**. It is fully open-source (MIT), machine-readable, and designed from the ground up for AI agent consumption.

### Key Properties

- **Deterministic** -- Same inputs always produce identical outputs. Any validator can reproduce any score.
- **Verifiable** -- All data sources are publicly accessible. No hidden factors or proprietary signals.
- **Unforgeable** -- Verification dimension weighted at 40% in public assessment. SEC filings, Wikidata entries, and 10-year domain age cannot be faked.
- **Tamper-proof** -- SHA-256 hash chain + Base L2 blockchain anchoring + IPFS monthly snapshots.
- **Fair** -- No pay-for-trust. Scores reflect behavior, not subscription level.
- **Category-aware** -- Three site categories (ecommerce / saas / non_commerce) with tailored scoring weights.
- **Safety-first** -- Google Web Risk Layer 0 one-vote veto: flagged domains get score=0, status SUSPENDED.

## Quick Start

```bash
# Verify any merchant instantly
npx @otr-protocol/validator verify nike.com

# Output:
# ┌──────────────────────────────────────────────┐
# │  nike.com                             GOLD   │
# │  Trust Score: 88/100   Category: ecommerce   │
# │  OTR-ID: OTR-1C-7F3A2B9E4D1C-K4             │
# │                                              │
# │  Verification:   85  ██████████████░░        │
# │  Security:       80  █████████████░░░        │
# │  Governance:     72  ████████████░░░░        │
# │  Transparency:   75  ████████████░░░░        │
# │  Data Quality:   65  ██████████░░░░░░        │
# │  Fulfillment:    --  (COLD mode)             │
# └──────────────────────────────────────────────┘
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

> *"Is nike.com trustworthy?"* --> OTR returns trust score 88/100, badge GOLD, and a 6-dimension breakdown (Verification, Security, Governance, Transparency, DataQuality, Fulfillment) with evidence sources.

### Two MCP Tools — One Call = Complete Answer

| Tool | Description | Returns |
|------|-------------|---------|
| `verify_merchant` | Complete merchant profile in one call | Trust score (0-100), badge, 6-dimension breakdown, safety status (Google Web Risk), site classification (ecommerce/saas/non_commerce), entity data, policy URLs, data sources |
| `search_registry` | Search the OTR merchant registry | Paginated merchant list with scores, badges, and recommendations |

**Design philosophy:** AI agents should get everything they need in a single tool call. `verify_merchant` returns trust assessment + purchase capabilities + links + policy URLs + data freshness — no need to chain multiple calls.

### TypeScript SDK

```typescript
import { OtrClient } from "@otr-protocol/sdk";

const otr = new OtrClient();
const result = await otr.verify("nike.com");

console.log(result.trustScore);   // 88
console.log(result.badge);        // "GOLD"
console.log(result.dimensions);   // { verification: 85, security: 80, ... }

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
                         │  │ 6 Dimension Evaluators   │  │
                         │  │ Verification | Security  │  │
                         │  │ Governance | Transparency│  │
                         │  │ DataQuality | Fulfillment│  │
                         │  └─────────────────────────┘  │
                         │  ┌─────────────────────────┐  │
                         │  │ 10-Layer Anti-Fraud      │  │
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
     │  Finnhub.io      │    │                      │    │                    │
     │  Google Web Risk │    │                      │    │                    │
     │  Website Scan    │    │                      │    │                    │
     └─────────────────┘    └──────────────────────┘    └───────────────────┘
```

## How Scoring Works

### 6 Trust Dimensions

Weights vary by site category:

| # | Dimension | E-Commerce COLD | SaaS COLD | AUTH Mode | What It Measures |
|---|-----------|:-:|:-:|:-:|------------------|
| 1 | **Verification** | **0.40** | 0.37 | 0.10 | Stock exchange, Wikidata, GLEIF LEI, domain age, Tranco rank, payment processors |
| 2 | **Security** | 0.15 | 0.20 | 0.10 | SSL/TLS, DMARC, SPF, DKIM, HSTS, DNSSEC, CSP, CAA, WAF, security.txt (15 signals) |
| 3 | **Governance** | 0.20 | 0.23 | 0.10 | Privacy policy, GDPR/CCPA, terms, refund/return, shipping, cookie consent (10 signals) |
| 4 | **Transparency** | 0.10 | 0.15 | 0.05 | robots.txt, sitemap, Schema.org, hreflang, AI crawler policy, llms.txt, about page |
| 5 | **Data Quality** | 0.15 | 0.05 | 0.25 | E-commerce: 22 product data signals. SaaS: 12 platform signals (API docs, SLA, pricing, security certs) |
| 6 | **Fulfillment** | -- | -- | **0.40** | Delivery speed, return window, tracking, shipping policy (COLD mode: not scored) |

### Three Site Categories

| Category | Description | Scoring |
|----------|-------------|---------|
| `ecommerce` | Online stores selling physical/digital products | Full 6-dimension scoring with product D signals |
| `saas` | Software-as-a-Service platforms | Tailored weights (V=37%, G=23%) with 12 SaaS D signals |
| `non_commerce` | Non-commercial sites (Wikipedia, government, etc.) | Not scored -- returns identity signals only |

### OTR-ID

Every evaluated domain receives a unique identifier:

```
Format: OTR-1{C|A}-{12hex}-{2check}
Example: OTR-1C-7F3A2B9E4D1C-K4

  OTR-1  = Protocol version 1
  C|A    = C (COLD) or A (AUTH) mode
  12hex  = SHA-256 first 48 bits of domain
  2check = Luhn mod 36 checksum
```

### Google Web Risk (Layer 0 Safety)

Google Web Risk operates as a Layer 0 one-vote veto, separate from dimension scoring:
- Flagged domain → `trustScore = 0`, `otrIdStatus = SUSPENDED`, `safety.googleWebRisk = true`
- Does not participate in dimension weight calculation
- Overrides all other signals regardless of their values

### Two Scoring Modes

```
COLD Mode: Public Assessment (no merchant cooperation needed)
═══════════════════════════════════════════════════════════════
  E-Commerce: V (0.40) + S (0.15) + G (0.20) + T (0.10) + D (0.15) = Score
  SaaS:       V (0.37) + S (0.20) + G (0.23) + T (0.15) + D (0.05) = Score

  Nike (ecommerce):   V=85×0.40 + S=80×0.15 + G=72×0.20 + ...  = 83 GOLD
  Scam site:          V=10×0.40 + S=100×0.15 + G=90×0.20 + ...  = 39 UNRATED
                                                                    ↑ can't game Verification


AUTH Mode: Verified Merchant (merchant provides API access)
═══════════════════════════════════════════════════════════════
  F (0.40) + D (0.25) + V (0.10) + S (0.10) + G (0.10) + T (0.05) = Score

  Good merchant:   F=90×0.40 + D=85×0.25 + ...  = 78 SILVER
  Bad merchant:    F=30×0.40 + D=40×0.25 + ...  = 38 UNRATED
                                                    ↑ bad fulfillment = low score
```

### Trust Badges

| Badge | Score | AI Agent Action |
|-------|:-----:|-----------------|
| **PLATINUM** | 90-100 | Safe to recommend with high confidence |
| **GOLD** | 80-89 | Strong trust, recommended for AI agents |
| **SILVER** | 70-79 | Recommend with standard caution |
| **BRONZE** | 60-69 | Display only, suggest user verify independently |
| **UNRATED** | 0-59 | Warn user about insufficient trust data |

> Scores 95+ trigger human review recommendation. No hard cap. If safety.status is "DANGEROUS" (Google Web Risk), DO NOT recommend regardless of score.

## 10-Layer Anti-Fraud Engine

OTR prevents fraudulent sites from gaming the system through a 10-layer detection pipeline:

```
Layer 0  Safety Check        Google Web Risk API — malware/phishing one-vote-veto (instant block)
Layer 1  Domain Age          Certificate history analysis (crt.sh)
Layer 2  SSL Security        HTTPS/HSTS verification, self-signed detection
Layer 3  DNS Security        DMARC, SPF, DKIM policy completeness
Layer 4  Domain Pattern      Brand impersonation (amaz0n-deals.xyz), suspicious TLDs
Layer 5  Tranco Rank         Independent traffic ranking verification
Layer 6  Content Analysis    Phishing keywords, parked domains, empty pages
Layer 7  Redirect Chain      Cross-domain redirect detection
Layer 8  Cross-Signal        Multi-signal correlation and accumulation rules
Layer 9  Anti-Gaming         Signal-brand mismatch, identity-gameable gap, template suspect
         ▼
         Layer 0 DANGEROUS = immediate rejection (one-vote-veto)
         Single CRITICAL signal = immediate rejection
         Fraud score > 30 = rejection
         Anti-gaming multiplier applied to gameable dimensions
```

### Anti-Gaming Detection Patterns (Layer 9)

| Pattern | Trigger | Multiplier |
|---------|---------|:----------:|
| Signal-Brand Mismatch | Gameable avg ≥ 80 + no Tranco/Wikidata/SEC + Identity < 30 | 0.5x |
| Identity-Gameable Gap | Identity < 20 + gameable avg > 70 + no established identity | 0.7x |
| Template Site Suspect | Domain < 1yr + no Tranco/Wikidata/SEC + gameable avg > 60 | 0.5x |
| Domain Age Gate (<6mo) | Domain under 6 months | Cap at 50 |
| Domain Age Gate (<1yr) | Domain under 1 year | Cap at 75 |

### Anti-Gaming in Practice

| Scenario | Old v3 Score | New v4 Score | Change |
|----------|:----:|:----:|:------:|
| Nike (legitimate brand) | 83 GOLD | 83 GOLD | -- |
| Scam site (perfect tech) | 39 UNRATED | 35 UNRATED | -4 |
| Scam site + anti-gaming | 28 UNRATED | 22 UNRATED | -6 |

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
  google-web-risk   1.0   Google Safe Browsing → one-vote-veto on DANGEROUS
  sec.gov           1.0   Government source → highest trust
  dns-query         0.9   Infrastructure → high trust
  tranco-list.eu    0.9   Academic source → high trust
  wikidata.org      0.8   Community source → high but editable
  finnhub.io        0.7   Commercial API → moderate-high trust
  website-scan      0.6   Self-reported → moderate trust
  product-sample    0.5   Product page sampling → public but limited scope
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
| Multi-source verification | **6 dimensions** | 1 (stars) | 1 (grade) | Partial |
| Anti-gaming detection | **10-layer** | No | No | No |
| Machine-readable output | **Full JSON** | Partial | No | Partial |
| Immutable audit trail | **3-layer** | No | No | No |
| Category-aware scoring | **3 types** | No | No | No |
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
- Site category detection (ecommerce / saas / non_commerce)
- Scoring mode detection (COLD vs AUTH)
- Individual dimension scoring with category-specific weights
- Badge and tier assignment (PLATINUM/GOLD/SILVER/BRONZE/UNRATED)
- Anti-gaming detection and penalty application
- Google Web Risk safety override
- Non-commerce exclusion
- Edge cases (empty data, null fields, boundary values)

## Scoring Fairness Statement

OTR Protocol maintains the integrity and independence of merchant trust scores through these commitments:

1. **No Score Selling** -- Trust scores cannot be purchased, sponsored, or commercially influenced.
2. **No Pay-for-Trust** -- Subscription status has zero impact on OTR scores. Free-tier merchants receive identical scoring treatment.
3. **No Human Override** -- All scores are computed algorithmically. No individual can manually adjust any score.
4. **Algorithmic Transparency** -- The entire algorithm is open-source (MIT). Anyone can audit, verify, and reproduce any score.
5. **Data-Driven Only** -- Scores reflect independently verifiable signals. Integration time, partnership status, and non-behavioral factors have no influence.

**Enforcement:** Open-source code + conformance tests + governance process.

## Roadmap

| Phase | Status | Description |
|-------|:------:|-------------|
| Phase 1 | **Complete** | Open-source scoring engine, MCP Server, CLI, SDK, conformance tests |
| Phase 2 | **Complete** | Hash chain integrity, L2 anchoring, IPFS snapshots, multi-source consensus, data desensitization, score decay, Google Web Risk Layer 0 safety, 3 site categories (ecommerce/saas/non_commerce), SaaS D-dimension 12 signals, COLD/AUTH scoring modes |
| Phase 3 | Planned | IETF Internet-Draft standardization, Python/Go SDKs, academic paper |

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
