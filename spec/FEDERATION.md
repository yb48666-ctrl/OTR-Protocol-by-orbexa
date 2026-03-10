# OTR Federation Specification

**Multi-Validator Trust Consensus for AI Agent Commerce**

**Status:** Draft (Phase 3 Roadmap)
**Version:** 3.0.0
**Date:** 2026-03-11
**Authors:** ORBEXA <dev@orbexa.io>
**License:** MIT

---

## 1. Overview

The OTR Federation model enables multiple independent validators to assess merchant trustworthiness, preventing single-point-of-failure and increasing scoring credibility through consensus. Federation distributes authority across independent organizations, each running the same deterministic scoring algorithm against independently-collected data, so that no single entity controls merchant trust.

**Design Inspirations:** Certificate Transparency (append-only logs, public auditability), Tranco (multi-source aggregation, manipulation resistance), DMARC/SPF/DKIM (DNS-based self-publishing), BGP RPKI (multi-authority validation).

**Goals:**
1. **No single point of failure** — Compromise of one validator MUST NOT compromise the registry.
2. **Manipulation resistance** — Gaming a score MUST require deceiving 3+ validators simultaneously.
3. **Deterministic verification** — Any party MUST be able to reproduce any published score from raw inputs.
4. **Low cost** — Federation transparency anchoring SHOULD cost less than $50/year per validator.
5. **Incremental adoption** — The protocol MUST support progressive decentralization (Phase 1-3).

## 2. Architecture

### 2.1 System Topology

```
                  OTR Governance Council (open, elected)
                            |
              ┌─────────────┼─────────────┐
              V             V             V
        Validator A    Validator B    Validator C
        (ORBEXA)       (Academic)     (Non-profit)
              |             |             |
     ┌────────┴───┐  ┌─────┴────┐  ┌─────┴────┐
     │ Data Collect│  │ Data Collect│ │ Data Collect│  (independent pipelines)
     │ → Score     │  │ → Score     │ │ → Score     │  (deterministic engine)
     │ → ECDSA Sign│  │ → ECDSA Sign│ │ → ECDSA Sign│
     └────────┬───┘  └─────┬────┘  └─────┬────┘
              └─────────────┼─────────────┘
                            V
               ┌─────────────────────────┐
               │    Consensus Engine     │
               │ (each validator runs    │
               │  independently)         │
               └────────────┬────────────┘
                            V
               ┌─────────────────────────┐
               │   Transparency Log      │
               │ L1: PostgreSQL Hash Chain│
               │ L2: Base L2 Daily Anchor│
               │ L3: IPFS Monthly Snapshot│
               └────────────┬────────────┘
                            V
               AI Agents / Public Auditors
```

### 2.2 Data Flow: Score Submission and Verification

```
Validator A                         Validator B (receiving)
    |                                    |
    | 1. Crawl merchant data (own sources)|
    | 2. Run deterministic scoring        |
    | 3. Sign payload (ECDSA P-256)       |
    |── FederatedScoreSubmission ────────>|
    |  { rawInputs, score, signature }    |
    |                          4. Verify ECDSA signature
    |                          5. Validate rawInputs schema
    |                          6. Re-compute score from rawInputs
    |                          7. |localScore - submitted| ≤5 → ACCEPT
    |                                                      >5 → SUSPICIOUS
    |                          8. Consensus check (3+ agree → CONFIRMED)
    |                          9. Compute weighted consensus score
    |                         10. Write to transparency log
    |<──────── ACK / NACK ──────────────|
```

### 2.3 Validator Communication

- **Transport:** HTTPS with mutual TLS 1.3 (mTLS) using validator certificates.
- **Message format:** JSON, canonicalized per RFC 8785 for signature stability.
- **Submission cadence:** At least every 48 hours per monitored domain.
- **Heartbeat:** Every 60 seconds. Three missed heartbeats → peer marked `UNREACHABLE`.

## 3. Core Principles

### 3.1 Deterministic Scoring

The scoring algorithm MUST be deterministic: identical inputs produce identical outputs across all validators. See `SCORING-ALGORITHM-v3.md` Section 2.

```
INVARIANT: e1 === e2 → calculateTrustScore(e1) === calculateTrustScore(e2)
```

### 3.2 Multi-Validator Consensus

A score achieves "confirmed" status when **3+ independent validators** produce scores within ±5 points. The threshold accounts for data-collection timing while catching genuine manipulation.

### 3.3 Input Transparency

Validators MUST publish **raw scoring inputs** alongside computed scores. Score-only submissions MUST be rejected.

### 3.4 Independent Data Collection

Each validator MUST independently collect raw data. Sharing crawled data before scoring is prohibited.

## 4. Validator Requirements

### 4.1 Independence

Validators MUST have no commercial relationship with scored merchants. No payment, sponsorship, or in-kind consideration from any scored or scorable entity. Verified during annual audit.

### 4.2 Infrastructure Requirements

| Requirement           | Minimum          | Recommended        |
|-----------------------|------------------|--------------------|
| API uptime            | 99.5% (monthly)  | 99.9%              |
| Score query latency   | p99 < 500ms      | p99 < 200ms        |
| Data refresh cadence  | Every 48 hours   | Every 24 hours     |
| Geographic redundancy | Single region    | Multi-region       |
| Backup frequency      | Daily            | Continuous repl.   |

Two consecutive months below 99.5% triggers Governance Council review.

### 4.3 Cryptographic Key Management

- **Algorithm:** ECDSA P-256 for all score submissions.
- **Storage:** HSM or equivalent cloud KMS (AWS KMS, Google Cloud HSM, Azure Key Vault).
- **Rotation:** At least every 12 months; announced 14 days in advance.
- **Revocation:** Published to revocation list within 1 hour. See Section 10.

### 4.4 Data Freshness Requirements

| Data Source               | Max Staleness | Data Source               | Max Staleness |
|---------------------------|---------------|---------------------------|---------------|
| WHOIS / domain reg.       | 7 days        | Tranco ranking            | 7 days        |
| SSL certificate status    | 24 hours      | SEC EDGAR filings         | 30 days       |
| DNS records (SPF/DMARC)   | 24 hours      | Wikidata entity status    | 7 days        |
| Website content / policies| 48 hours      | Fulfillment data (Ph. 2)  | 24 hours      |

Submissions exceeding staleness thresholds MUST include `dataFreshnessWarning` and MAY be down-weighted.

### 4.5 Conformance and Audit

- **100%** conformance test vector pass rate required. Re-tested on every algorithm update.
- Algorithm updates MUST be deployed within **14 days** of release.
- **Annual audit** covers: independence (financial records), infrastructure (uptime/latency), conformance (witnessed test execution), key management (HSM logs, rotation history), data collection independence, and code audit vs. reference implementation.
- Audit results published to transparency log. Failure → 30 days to remediate or suspension.

## 5. Federation Phases

**Phase 1 (Current):** ORBEXA as sole validator. Scores carry `SINGLE_VALIDATOR` status. Algorithm open-source (MIT). Hash chain + L2 anchoring + IPFS snapshots active.

**Phase 2:** 2-3 accredited validators. Multi-validator consensus (`CONFIRMED`/`PROVISIONAL`). Anti-poisoning defense enabled (Section 8). Individual signing keys issued by Council.

**Phase 3:** Open federation. Elected Governance Council. 2-of-3 Safe multi-sig for governance actions. Validator trust weights. Automatic anomaly quarantine.

## 6. Federated Score Submission

```typescript
interface FederatedScoreSubmission {
  validatorId: string;            // Unique validator identifier
  validatorSignature: string;     // ECDSA P-256 signature over payload
  algorithmVersion: string;       // Semver of scoring algorithm
  domain: string;                 // Merchant domain
  rawInputs: ScoringEvidence;     // Complete raw input data
  dataFreshnessWarning?: boolean; // True if any input exceeds staleness
  computedScore: number;          // Composite score [0, 94]
  dimensionScores: {              // Per-dimension [0, 100]
    identity: number; technical: number; compliance: number;
    policyScore: number; webPresence: number;
    dataQuality: number; fulfillment: number;
  };
  badge: string;                  // PLATINUM | GOLD | SILVER | BRONZE | UNRATED
  antiGamingApplied?: { severity: string; multiplier: number; patterns: string[] };
  computedAt: string;             // ISO 8601
  submissionId: string;           // UUIDv7
}
```

**Rules:** Payloads signed over canonical JSON (RFC 8785). Full `rawInputs` required. Algorithm version MUST be within one minor version of current release.

## 7. Score Consensus Algorithm

### 7.1 Consensus Steps

```
Step 1: RECEIVE   — Receive FederatedScoreSubmission from peer.
Step 2: VERIFY    — Verify ECDSA P-256 signature. Fail → REJECT.
Step 3: VALIDATE  — Confirm rawInputs schema matches algorithmVersion. Fail → REJECT.
Step 4: RE-COMPUTE — Run scoring algorithm locally on rawInputs.
Step 5: COMPARE   — deviation = |localScore - submittedScore|
                    ≤5 → ACCEPT into consensus pool.
                    >5 → FLAG SUSPICIOUS; store but do NOT merge.
Step 6: CONSENSUS — 3+ validators within ±5 → CONFIRMED
                    2 agree → PENDING | <2 → UNCONFIRMED
Step 7: SCORE     — consensusScore = Σ(weight[i] × score[i]) / Σ(weight[i])
                    Round to integer. Cap at 94.
Step 8: PUBLISH   — Write to transparency log with all scores + consensus result.
```

### 7.2 Validator Weight System

| Factor                           | Weight Contribution          |
|----------------------------------|------------------------------|
| Base (all validators)            | 1.0                          |
| Years of operation               | +0.05/year (cap +0.25)       |
| Consecutive clean audits         | +0.1/audit (cap +0.3)        |
| Data source diversity (3+ sources)| +0.1                        |
| Trailing 12-month uptime >99.9%  | +0.1                        |

**Example:** 3 years + 2 audits + diverse sources + 99.95% uptime = 1.0 + 0.15 + 0.2 + 0.1 + 0.1 = **1.55**.

### 7.3 Edge Cases

- **Split consensus** (2 vs 2, deviation >5) → `DISPUTED`, see Section 11.
- **Stale submissions** (>48 hours) excluded from consensus.
- **Single validator** (Phase 1) → `SINGLE_VALIDATOR` status.

## 8. Anti-Poisoning Defense

A compromised validator could poison the registry by submitting inflated/deflated scores or fabricated rawInputs. This section defines multi-layered defenses ensuring no single validator can corrupt consensus.

### 8.1 Isolation Principle

Each validator's submissions are stored in an **isolated partition**, never directly merged. All external submissions are untrusted claims requiring independent verification.

```
Validator B (Receiving)
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ A's subs │  │ B local  │  │ C's subs │  ← isolated stores
  │(untrusted)│ │(primary) │  │(untrusted)│
  └────┬─────┘  └────┬─────┘  └────┬─────┘
       └──── Consensus Engine ─────┘        ← re-computes, compares
                     │
              Canonical Registry            ← written only after consensus
```

### 8.2 Score Re-Computation Requirement

Receiving validators MUST NEVER trust external scores directly. For every submission: extract `rawInputs` → execute scoring locally → compare with `computedScore` → proceed only if deviation ≤ 5. This follows the multi-source consensus pattern (`otrSourceConsensusService.ts`), where each source is independently verified.

### 8.3 Deviation Detection

| Deviation | Classification | Action                              |
|-----------|----------------|-------------------------------------|
| 0-5       | NORMAL         | Accept into consensus pool          |
| 6-10      | SUSPICIOUS     | Store, exclude, alert (+1 anomaly)  |
| 11-20     | ANOMALOUS      | Exclude (+2 anomaly points)         |
| 21+       | CRITICAL       | Reject (+5 anomaly points)          |

### 8.4 Source Weight System

Each validator acts as an independent "source" with trust weight per Section 7.2. New validators start at 1.0; proven validators reach up to 1.55, giving proportionally more consensus influence.

### 8.5 Anomaly Accumulation and Quarantine

Rolling 30-day window: SUSPICIOUS +1, ANOMALOUS +2, CRITICAL +5, clean submission -0.5 (floor 0). **Quarantine threshold: 15 points.** Quarantined validators are suspended from consensus, require emergency audit within 7 days, and Governance Council supermajority for reinstatement.

### 8.6 Gradual Drift Detection

Trailing 30-day trend monitoring: average score drift > 3 points/month relative to consensus mean → `DRIFT_DETECTED`. Three consecutive flags trigger formal review.

## 9. Transparency Log

### 9.1 Three-Layer Architecture

| Layer | System                    | Cost/Year | Cadence  | Purpose                          |
|-------|---------------------------|-----------|----------|----------------------------------|
| L1    | PostgreSQL Hash Chain     | $0        | Real-time| record_hash + prev_hash + chain_sequence |
| L2    | Base L2 (OTRAnchor.sol)   | ~$0.37    | Daily    | SHA-256 chain tip → on-chain anchor |
| L3    | IPFS (web3.storage)       | $0        | Monthly  | Content-addressed JSON snapshot  |

**Total annual cost: ~$12** (including compute and monitoring).

### 9.2 Hash Chain Schema

```sql
CREATE TABLE otr_transparency_log (
  id BIGSERIAL PRIMARY KEY, chain_sequence BIGINT NOT NULL UNIQUE,
  record_type TEXT NOT NULL,  -- 'score' | 'consensus' | 'audit' | 'revocation'
  domain TEXT NOT NULL, record_data JSONB NOT NULL,
  record_hash TEXT NOT NULL,  -- SHA-256(canonical(record_data))
  prev_hash TEXT NOT NULL,    -- record_hash of chain_sequence - 1
  validator_id TEXT NOT NULL, validator_sig TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Invariant:** `record.prev_hash === prev_record.record_hash` for all `chain_sequence > 0`. Any violation MUST trigger immediate alert.

### 9.3 L2 Anchoring Contract

```solidity
contract OTRAnchor {
    event Anchored(uint256 indexed day, bytes32 chainTipHash, uint64 recordCount, uint256 timestamp);
    function anchor(uint256 day, bytes32 chainTipHash, uint64 recordCount) external onlyValidator {
        emit Anchored(day, chainTipHash, recordCount, block.timestamp);
    }
}
```

### 9.4 Public Verification Endpoints

```
GET /api/otr/audit/chain-integrity → { status, chainLength, latestHash, brokenLinks }
GET /api/otr/audit/chain/:domain   → { domain, entries: [{ chainSequence, score, consensusStatus, validators }] }
GET /api/otr/audit/l2-anchors      → { anchors: [{ day, chainTipHash, recordCount, txHash }] }
GET /api/otr/audit/snapshots       → { snapshots: [{ month, cid, entryCount }] }
```

## 10. Key Management

### 10.1 Phase 1: AWS KMS (Single Validator)

ECDSA P-256 via AWS KMS (`ECC_NIST_P256`). IAM role-restricted access. CloudTrail audit logging. Annual rotation with 14-day overlap.

### 10.2 Phase 2: Individual Validator Keys

Validator generates key pair in HSM/KMS → submits CSR to Governance Council → Council verifies identity out-of-band → issues validator certificate → published to append-only key registry → all peers update trusted store.

### 10.3 Phase 3: 2-of-3 Safe Multi-Signature

Critical operations (log governance, algorithm activation, validator registration) require 2-of-3 Safe multi-sig: ORBEXA + academic validator + non-profit validator.

### 10.4 Key Rotation

Generate new key → sign `KeyRotationNotice` with **old** key (new pubkey + activation date, min 14 days out) → broadcast to peers + transparency log → 14-day overlap where both accepted → old key revoked after activation.

### 10.5 Emergency Revocation

Broadcast `KeyRevocationNotice` signed by **backup key** (registered at accreditation) → all validators stop accepting revoked key immediately → logged within 1 hour → new key via expedited 48-hour rotation (Council approval required).

## 11. Dispute Resolution

### 11.1 Categories

| Category               | Resolution Path         |
|------------------------|-------------------------|
| Score disagreement     | Technical review panel  |
| Data source dispute    | Evidence comparison     |
| Independence complaint | Audit investigation     |
| Algorithm dispute      | RFC process (Sec. 12.3) |
| Conduct violation      | Governance vote         |

### 11.2 Score Disagreement Resolution

1. **Automated:** Collect rawInputs from all validators for disputed domain.
2. **Comparison:** Categorize differences as timing (acceptable), source discrepancy (investigate), or fabrication (escalate).
3. **Panel:** 3-person technical review (one per validator class). Binding determination within 14 days.
4. **Publication:** Recorded in transparency log.

### 11.3 Merchant Appeal

Merchant submits appeal via API → acknowledged within 48 hours → 2+ validators review → data errors corrected within 7 days → outcome logged. Algorithm disputes directed to RFC process.

### 11.4 Escalation Path

```
Level 1: Automated detection (48 hours)
  → Level 2: Technical review panel (14 days)
    → Level 3: Full Governance Council vote
      → Level 4: External arbitration
```

## 12. Governance

### 12.1 Council Composition

One representative per accredited validator + one independent Chair. Maximum 7 members (Phase 3). 2-year staggered terms; Chair serves 3 years (re-electable once). No organization holds more than one seat.

### 12.2 Decision-Making

| Decision Type              | Majority    | Comment Period | Effective After |
|----------------------------|-------------|----------------|-----------------|
| Algorithm change           | 2/3 supermaj| 30 days        | 14-day deploy   |
| Protocol extension         | 2/3 supermaj| 60 days        | 30-day deploy   |
| Validator accreditation    | Simple      | 14 days        | Immediate       |
| Validator suspension       | 2/3 supermaj| 7 days         | Immediate       |
| Charter amendment          | Unanimous   | 90 days        | 30-day deploy   |
| Emergency security response| Simple      | None           | Immediate       |

All decisions recorded in transparency log with vote tally and rationale.

### 12.3 RFC Process

1. **DRAFT** — Submit to otr-protocol repository (motivation, spec, compatibility, test vectors, security).
2. **COMMENT** — Public period per table above. Author MUST respond to substantive comments.
3. **REVISION** — Revise based on feedback. Substantial changes may extend comment period.
4. **VOTE** — Governance Council. Quorum: 2/3 of members present.
5. **IMPLEMENT** — Validators deploy per timeline. Conformance tests updated.
6. **ACTIVATION** — Effective after all validators confirm. Grace period for rollback.

### 12.4 Emergency Procedures

Any Council member MAY invoke emergency procedures. Simple majority with 1-hour response window. Scope: validator suspension, key revocation, score freeze. Emergency actions auto-reverse after 7 days if not ratified by supermajority. Post-incident report within 30 days.

---

*This specification is a living document. Changes follow the RFC process (Section 12.3). Canonical version: `spec/FEDERATION.md` in the OTR protocol repository.*
