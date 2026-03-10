# OTR Federation Specification

**Multi-Validator Trust Consensus for AI Agent Commerce**

**Status:** Draft (Phase 3 Roadmap)
**Version:** 3.0.0

---

## 1. Overview

The OTR Federation model enables multiple independent validators to
assess merchant trustworthiness, preventing single-point-of-failure
and increasing scoring credibility through consensus.

Inspired by:
- **Certificate Transparency (CT)** — append-only transparency logs
- **Tranco** — multi-source aggregation with manipulation resistance
- **DMARC/SPF/DKIM** — DNS-based self-publishing for independent verification

## 2. Architecture

```
OTR Governance Council (open, elected)
        |
    ┌───┼───┐
    V   V   V
  Validator A  Validator B  Validator C
  (ORBEXA)     (Academic)   (Non-profit)
    |           |           |
    ├── Independently crawl merchant data
    ├── Run identical open-source scoring algorithm
    ├── Publish signed trust assessments
    └── Write to append-only transparency log
```

## 3. Core Principles

### 3.1 Deterministic Scoring

The scoring algorithm is **deterministic**: identical inputs MUST produce
identical outputs across all validators. This eliminates discretionary
divergence and prevents a "race to the bottom."

### 3.2 Multi-Validator Consensus

A score is "confirmed" when **3+ independent validators** produce scores
within ±5 points of each other for the same domain.

```
Validator A: nike.com → 87
Validator B: nike.com → 85
Validator C: nike.com → 88
Consensus: 87 (mean), deviation ≤ 5 → CONFIRMED
```

### 3.3 Input Transparency

Validators must publish their **raw scoring inputs** alongside computed
scores. This allows any party to independently verify the computation.

## 4. Validator Requirements

Organizations seeking to become OTR validators must:

1. **Independence** — Demonstrate no commercial relationship with scored merchants
2. **Conformance** — Pass the OTR conformance test suite (100% of test vectors)
3. **Transparency** — Publish all scoring inputs and computations publicly
4. **Availability** — Maintain 99.5%+ uptime for scoring API
5. **Audit** — Undergo annual compliance review
6. **Code of Conduct** — Commit to the OTR governance principles

## 5. Federation Phases

### Phase 1: Single Validator (Current)
- ORBEXA operates as sole validator
- Algorithm is open-source for independent verification
- Hash chain provides immutable audit trail

### Phase 2: Federated Validators
- 2-3 accredited organizations run independent validators
- Multi-validator consensus for "confirmed" status
- Federated score submissions verified against conformance tests

### Phase 3: Open Federation
- Any accredited organization can join
- Governance council with elected representatives
- Decentralized dispute resolution
- Multi-signature write access to transparency log

## 6. Federated Score Submission

```typescript
interface FederatedScoreSubmission {
  validatorId: string;        // Validator identity
  validatorSignature: string; // ECDSA P-256 signature
  domain: string;
  rawInputs: ScoringEvidence; // Raw input data (not just score)
  computedScore: number;      // Validator's computed score
  computedAt: string;         // ISO 8601 timestamp
}
```

### Processing Rules

1. **Verify signature** — Confirm submission authenticity
2. **Re-compute independently** — Use rawInputs to calculate score locally
3. **Compare** — If deviation > 5 points, flag as suspicious
4. **Consensus** — If 3+ validators agree (±5), mark as "confirmed"

**Critical:** Never directly trust external scores. Always re-compute
from raw inputs to detect gaming or compromised validators.

## 7. Transparency Log

Append-only Merkle tree structure for immutable scoring history.

### Three-Layer Architecture

```
Layer 1: PostgreSQL Hash Chain   (real-time, $0/year)
Layer 2: Base L2 Daily Anchoring (~$0.37/year)
Layer 3: IPFS Monthly Snapshots  ($0/year via web3.storage)
```

Total annual cost: ~$12

### Public Verification Endpoints

```
GET /api/otr/audit/chain-integrity     Verify hash chain
GET /api/otr/audit/chain/:domain       Domain change history
GET /api/otr/audit/l2-anchors          L2 anchor records
GET /api/otr/audit/snapshots           IPFS snapshot CIDs
```

## 8. Governance

### Decision Making

- **Scoring algorithm changes** — RFC + 30-day comment + conformance tests
- **Protocol extensions** — RFC + 60-day comment + consensus
- **Validator accreditation** — Application + review + annual compliance
- **Dispute resolution** — Governance council vote

### Write Access Control

- Phase 1: ORBEXA only (AWS KMS-protected keys)
- Phase 2: Individual validator signing keys
- Phase 3: 2-of-3 Safe multi-signature (ORBEXA + academic + non-profit)
