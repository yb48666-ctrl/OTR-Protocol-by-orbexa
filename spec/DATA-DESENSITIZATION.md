# OTR Data Desensitization Specification

**Four-Level Data Protection Architecture for Merchant Trust Assessment**

**Status:** Draft
**Version:** 3.0.0
**Date:** 2026-03-11
**Authors:** ORBEXA <dev@orbexa.io>
**License:** MIT

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Handling Principles](#2-data-handling-principles)
3. [Four-Level Desensitization Architecture](#3-four-level-desensitization-architecture)
4. [Level 1: Pre-Transmission (Client-Side)](#4-level-1-pre-transmission-client-side)
5. [Level 2: Transport Encryption](#5-level-2-transport-encryption)
6. [Level 3: Server-Side Immediate Aggregation](#6-level-3-server-side-immediate-aggregation)
7. [Level 4: Audit Logging](#7-level-4-audit-logging)
8. [Data Classification](#8-data-classification)
9. [GDPR Compliance](#9-gdpr-compliance)
10. [CCPA Compliance](#10-ccpa-compliance)
11. [Data Retention Policy](#11-data-retention-policy)
12. [Incident Response](#12-incident-response)

---

## 1. Overview

The OTR protocol is designed to assess **merchant** trustworthiness, not to process **consumer** personal data. However, certain operational activities (logistics auditing, fulfillment verification, merchant API integration) may involve transient exposure to data that includes or is proximate to personally identifiable information (PII).

This specification defines a four-level data desensitization architecture that ensures PII is never persisted in OTR systems, all data is minimized to the furthest extent possible, and all processing operations comply with GDPR and CCPA requirements.

### 1.1 Fundamental Principle

**OTR scoring does NOT require consumer PII.** All scoring inputs are merchant-level business signals (domain configuration, corporate registry data, policy page content, product catalog metadata). The desensitization framework exists to handle edge cases where PII may be present in adjacent data flows.

### 1.2 Data Flow Overview

```
┌─────────────┐   Level 1         ┌──────────────┐   Level 2         ┌──────────────┐
│  Merchant   │   Pre-Transmission│   Transport   │   Encryption      │   OTR Server │
│  API / Data │──────────────────→│   Layer       │──────────────────→│              │
│  Sources    │   PII hashed,     │   TLS 1.3 +   │   Encrypted,      │   Level 3    │
│             │   addresses       │   HMAC signed │   tamper-proof    │   Immediate  │
│             │   truncated       │   + nonce     │                   │   Aggregation│
└─────────────┘                   └──────────────┘                   │              │
                                                                     │   Raw data   │
                                                                     │   NEVER      │
                                                                     │   persisted  │
                                                                     │              │
                                                                     │   Level 4    │
                                                                     │   Audit logs │
                                                                     │   (metadata  │
                                                                     │   only)      │
                                                                     └──────────────┘
```

## 2. Data Handling Principles

OTR data handling adheres to three core principles:

### 2.1 Minimize

Collect the absolute minimum data required for trust assessment. If a data point is not directly used in a scoring dimension, it MUST NOT be collected.

| Data Type                  | Collected? | Justification                              |
|----------------------------|------------|---------------------------------------------|
| Merchant domain            | Yes        | Primary scoring identifier                  |
| DNS records                | Yes        | Technical dimension scoring                 |
| SSL certificate metadata   | Yes        | Technical dimension scoring                 |
| Public corporate data      | Yes        | Identity dimension scoring                  |
| Policy page content        | Yes        | PolicyScore dimension scoring               |
| Product catalog metadata   | Yes        | DataQuality dimension scoring               |
| Order tracking numbers     | Yes        | Fulfillment dimension scoring (transient)   |
| Consumer names             | **No**     | Not required for any scoring dimension      |
| Consumer email addresses   | **No**     | Not required for any scoring dimension      |
| Consumer payment details   | **No**     | Not required for any scoring dimension      |
| Consumer shipping addresses| **No**     | Not required — only geographic region used  |

### 2.2 Aggregate

When individual data points are needed for computation, process them into aggregate statistics immediately. Never persist individual records.

| Input                          | Stored As                      | Example                           |
|--------------------------------|--------------------------------|-----------------------------------|
| Individual delivery times      | Average delivery days          | 3.2 days                         |
| Individual tracking events     | Tracking success rate          | 94%                              |
| Individual return requests     | Return rate percentage         | 2.1%                             |
| Order geographic distribution  | Region-level distribution      | 45% domestic, 55% international  |
| Individual complaint records   | Complaint rate                 | 0.3%                             |

### 2.3 Delete

Raw data that has been aggregated MUST be deleted immediately after aggregation. No raw data persists beyond the processing pipeline.

```
Processing Pipeline:
  Raw data received → Validated → Aggregated → Raw data deleted → Statistics stored

  Maximum raw data lifetime: 60 seconds (processing pipeline timeout)
```

## 3. Four-Level Desensitization Architecture

| Level | Name                    | Where            | Purpose                                    |
|-------|-------------------------|------------------|---------------------------------------------|
| 1     | Pre-Transmission        | Client-side      | Strip/hash PII before data leaves merchant  |
| 2     | Transport Encryption    | In transit       | Protect data integrity and confidentiality   |
| 3     | Immediate Aggregation   | Server-side      | Aggregate raw data; never persist individual records |
| 4     | Audit Logging           | Server-side      | Log operations metadata only; no content     |

## 4. Level 1: Pre-Transmission (Client-Side)

### 4.1 Purpose

Level 1 desensitization occurs on the merchant's side, before any data is transmitted to OTR systems. This is the strongest protection layer because PII never leaves the merchant's infrastructure.

### 4.2 PII Hashing

Any fields that may contain PII MUST be hashed before transmission using HMAC-SHA256 with a merchant-specific key:

```
hashedValue = HMAC-SHA256(merchantKey, rawValue)
```

| Field Type          | Desensitization Method          | Example                                |
|--------------------|---------------------------------|----------------------------------------|
| Customer name      | HMAC-SHA256 hash                | `a3f2...8b91` (irreversible)           |
| Email address      | HMAC-SHA256 hash                | `7c1e...4f33` (irreversible)           |
| Phone number       | HMAC-SHA256 hash                | `b8d4...2a17` (irreversible)           |
| Order ID           | HMAC-SHA256 hash                | `e5a9...1c82` (irreversible)           |
| IP address         | Not transmitted                 | (excluded entirely)                    |

### 4.3 Address Truncation

Shipping addresses are truncated to geographic region before transmission:

| Original Field      | Transmitted As                  | Granularity        |
|---------------------|--------------------------------|-------------------|
| Full street address | Country + State/Province       | Region-level only  |
| Zip/postal code     | First 3 digits (US) or outward code (UK) | Area-level only |
| City                | Metropolitan area               | Metro-level only   |

```
Input:  "123 Main Street, Apt 4B, Portland, OR 97201, USA"
Output: { country: "US", region: "OR", area: "972" }
```

### 4.4 Tracking Number Handling

Logistics tracking numbers are transmitted in their original form (they are merchant-generated identifiers, not consumer PII) but are processed transiently and never persisted. See [Logistics Audit Framework](./LOGISTICS-AUDIT.md) for tracking number validation procedures.

## 5. Level 2: Transport Encryption

### 5.1 Purpose

Level 2 ensures data integrity and confidentiality during transmission between the merchant's systems and OTR servers.

### 5.2 TLS Requirements

| Requirement             | Specification                               |
|-------------------------|---------------------------------------------|
| Protocol version        | TLS 1.3 minimum                             |
| Certificate validation  | Full chain validation required              |
| Certificate pinning     | RECOMMENDED (HPKP or equivalent)            |
| Cipher suites           | AEAD ciphers only (AES-256-GCM, ChaCha20-Poly1305) |
| Forward secrecy         | Required (ECDHE key exchange)               |

### 5.3 Request Signing

All API requests from merchants to OTR MUST be signed using HMAC-SHA256:

```
Signature = HMAC-SHA256(merchantApiKey, canonicalRequest)

canonicalRequest = HTTP-Method + "\n"
                 + URI-Path + "\n"
                 + Sorted-Query-String + "\n"
                 + Timestamp + "\n"
                 + Nonce + "\n"
                 + SHA256(RequestBody)
```

### 5.4 Nonce Replay Prevention

Each request MUST include a unique nonce (UUID v4 or equivalent). The server maintains a nonce cache with a 5-minute TTL. Requests with previously-seen nonces are rejected.

```
Request Headers:
  X-OTR-Timestamp: 2026-03-11T12:00:00Z
  X-OTR-Nonce: 550e8400-e29b-41d4-a716-446655440000
  X-OTR-Signature: <HMAC-SHA256 signature>
```

| Validation Check         | Action on Failure                    |
|--------------------------|--------------------------------------|
| Timestamp > 5 min old    | Reject with 401 (replay suspected)   |
| Nonce already seen       | Reject with 409 (duplicate nonce)    |
| Signature mismatch       | Reject with 401 (authentication failed) |

## 6. Level 3: Server-Side Immediate Aggregation

### 6.1 Purpose

Level 3 ensures that even if data reaches OTR servers in a non-desensitized form (e.g., due to a merchant-side implementation error), it is immediately aggregated and the raw data is deleted.

### 6.2 Aggregation Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Receive    │     │   Validate   │     │   Aggregate  │     │    Store     │
│   Raw Data   │────→│   & Parse    │────→│   Into Stats │────→│   Statistics │
│              │     │              │     │              │     │   Only       │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │  Delete Raw  │
                                         │  Data from   │
                                         │  Memory      │
                                         └──────────────┘
```

### 6.3 Aggregation Rules

| Input Data Type             | Aggregation Function          | Output              |
|-----------------------------|-------------------------------|----------------------|
| Individual delivery times   | MEAN, MEDIAN, P95             | `avgDeliveryDays: 3.2` |
| Tracking validation results | COUNT(valid) / COUNT(total)   | `trackingRate: 0.94`   |
| Return request records      | COUNT(returns) / COUNT(orders)| `returnRate: 0.021`    |
| Order geographic data       | GROUP BY country, COUNT       | `domesticPct: 0.45`   |
| Product catalog entries     | COUNT, completeness metrics   | `catalogSize: 1250`    |
| Price accuracy checks       | COUNT(accurate) / COUNT(total)| `priceAccuracy: 0.98`  |

### 6.4 Memory Safety

- Raw data is processed in **isolated memory contexts** (per-request processing).
- Raw data is explicitly zeroed after aggregation (no reliance on garbage collection).
- Processing timeout: 60 seconds maximum. If aggregation does not complete, raw data is dropped.
- No raw data is ever written to disk, database, cache, or log.

### 6.5 What IS Persisted

Only the following aggregated, merchant-level data is persisted:

| Persisted Data                  | Data Type  | Contains PII? |
|---------------------------------|-----------|---------------|
| Merchant domain                 | String    | No            |
| 7 dimension scores              | Numbers   | No            |
| Composite trust score           | Number    | No            |
| Badge and tier                  | String    | No            |
| Anti-gaming detection result    | Object    | No            |
| Verification data (evidence)    | Object    | No            |
| Aggregate fulfillment metrics   | Numbers   | No            |
| Aggregate data quality metrics  | Numbers   | No            |
| Assessment timestamp            | ISO 8601  | No            |
| Hash chain entry                | SHA-256   | No            |

## 7. Level 4: Audit Logging

### 7.1 Purpose

Level 4 provides an audit trail for operational monitoring and compliance verification without exposing data content.

### 7.2 What IS Logged

| Log Field             | Example                                | Contains PII? |
|-----------------------|----------------------------------------|---------------|
| Timestamp             | `2026-03-11T12:00:00.000Z`            | No            |
| Operation type        | `TRUST_ASSESSMENT`                     | No            |
| Merchant domain       | `example.com`                          | No            |
| Assessment phase      | `PUBLIC_ASSESSMENT`                    | No            |
| Resulting score       | `82`                                   | No            |
| Anti-gaming severity  | `CLEAN`                                | No            |
| Processing duration   | `1.2s`                                 | No            |
| Data sources accessed | `["dns", "whois", "tranco"]`           | No            |
| Request origin IP     | `198.51.100.0/24` (network-level only) | Pseudonymized |
| Error (if any)        | `TIMEOUT: DNS query`                   | No            |

### 7.3 What is NOT Logged

| Excluded Data              | Reason                                   |
|----------------------------|------------------------------------------|
| Raw API request bodies     | May contain merchant data                |
| Raw API response bodies    | May contain scoring evidence details     |
| Individual order data      | PII-adjacent; only aggregates are logged |
| Tracking numbers           | Transient data; not logged               |
| Merchant API keys          | Security credential; never logged        |
| Consumer-related data      | Not collected; nothing to log            |

### 7.4 Log Retention

| Log Category           | Retention Period | Storage           |
|------------------------|-----------------|-------------------|
| Trust assessment logs  | 90 days         | Encrypted at rest |
| Error logs             | 30 days         | Encrypted at rest |
| Security event logs    | 365 days        | Encrypted at rest |
| Audit compliance logs  | 365 days        | Encrypted at rest |

## 8. Data Classification

### 8.1 Classification Levels

| Level         | Description                                    | Examples                                       |
|---------------|------------------------------------------------|------------------------------------------------|
| **PUBLIC**    | Available from public sources; no sensitivity  | Tranco rank, Wikidata QID, DNS records         |
| **BUSINESS**  | Merchant business data; moderate sensitivity   | Product catalog metadata, fulfillment metrics  |
| **SENSITIVE** | Data requiring desensitization                 | Shipping addresses, order details              |
| **PROHIBITED**| Data that MUST NOT enter OTR systems           | Payment card numbers, SSNs, health records     |

### 8.2 Classification Matrix

| Data Type                | Classification | Desensitization Required? | Persisted? |
|--------------------------|---------------|--------------------------|-----------|
| Domain name              | PUBLIC        | No                       | Yes       |
| DNS records              | PUBLIC        | No                       | Yes (aggregated) |
| SSL certificate metadata | PUBLIC        | No                       | Yes (aggregated) |
| Wikidata entity data     | PUBLIC        | No                       | Yes       |
| SEC filing data          | PUBLIC        | No                       | Yes       |
| Tranco ranking           | PUBLIC        | No                       | Yes       |
| Website content          | PUBLIC        | No                       | No (processed only) |
| Product catalog metadata | BUSINESS      | No                       | Yes (aggregated) |
| Order tracking numbers   | BUSINESS      | No                       | No (transient) |
| Aggregate delivery stats | BUSINESS      | No                       | Yes       |
| Customer names           | SENSITIVE     | HMAC-SHA256 hash         | No        |
| Shipping addresses       | SENSITIVE     | Region truncation        | No        |
| Email addresses          | SENSITIVE     | HMAC-SHA256 hash         | No        |
| Payment card numbers     | PROHIBITED    | N/A (never collected)    | No        |
| Social security numbers  | PROHIBITED    | N/A (never collected)    | No        |

## 9. GDPR Compliance

### 9.1 Lawful Basis

OTR processing is conducted under **legitimate interest** (GDPR Article 6(1)(f)) for merchant trust assessment. No consumer personal data is processed; all scoring inputs are merchant-level business data.

### 9.2 Data Protection Measures

| GDPR Principle          | OTR Implementation                                              |
|-------------------------|----------------------------------------------------------------|
| Lawfulness              | Legitimate interest for merchant trust assessment               |
| Purpose limitation      | Data used solely for trust scoring; no secondary use            |
| Data minimization       | Only scoring-relevant signals collected                         |
| Accuracy                | Regular re-verification (score decay enforces freshness)        |
| Storage limitation      | Raw data deleted immediately; aggregates retained per policy    |
| Integrity/confidentiality | TLS 1.3, HMAC signing, encryption at rest                   |
| Accountability          | Audit logging, transparency log, open-source algorithm          |

### 9.3 Data Subject Rights

Since OTR does not process consumer PII, most GDPR data subject rights are not directly applicable. For merchant-related data:

| Right                    | OTR Response                                              |
|--------------------------|----------------------------------------------------------|
| Right to access          | Merchants can query their own trust assessment via API    |
| Right to rectification   | Merchants can request re-assessment with corrected data   |
| Right to erasure         | Merchants can request removal from the registry           |
| Right to portability     | Trust assessment data is available in JSON format via API  |
| Right to object          | Merchants can opt out of the registry                     |

## 10. CCPA Compliance

### 10.1 Data Handling Under CCPA

| CCPA Category                | OTR Applicability                                    |
|------------------------------|------------------------------------------------------|
| Sale of personal information | OTR does NOT sell any personal information            |
| Consumer opt-out             | N/A — no consumer PII processed                      |
| Business-to-business data    | Merchant business data is not consumer PI under CCPA  |
| Service provider obligations | OTR acts as a service provider for merchant trust data|

### 10.2 California Consumer Rights

OTR maintains the following position under CCPA:

- **No consumer PII is collected** — OTR scoring operates entirely on merchant business data.
- **No data is sold** — Trust scores are provided as a service, not sold to third parties.
- **Transparency** — The scoring algorithm is open-source; any party can audit what data is used.

## 11. Data Retention Policy

| Data Category              | Retention Period | Deletion Method             |
|---------------------------|------------------|-----------------------------|
| Raw scoring evidence      | 0 (never persisted) | Never written to storage |
| Trust assessment results  | 12 months        | Automated purge             |
| Hash chain entries        | Indefinite       | Append-only (immutable)     |
| Aggregate metrics         | 12 months        | Automated purge             |
| Audit logs                | 90-365 days      | Automated purge (see Level 4) |
| IPFS snapshots            | Indefinite       | Distributed (no single-point deletion) |
| L2 blockchain anchors     | Indefinite       | Immutable (blockchain)      |

## 12. Incident Response

### 12.1 Data Breach Classification

| Severity  | Description                                           | Response Time |
|-----------|-------------------------------------------------------|--------------|
| Critical  | Consumer PII exposure (should not exist in system)    | Immediate    |
| High      | Merchant API keys or credentials exposed              | 1 hour       |
| Medium    | Raw scoring evidence leaked (business data)           | 4 hours      |
| Low       | Aggregate data or public data leaked                  | 24 hours     |

### 12.2 Response Procedures

1. **Contain** — Isolate affected systems and revoke compromised credentials.
2. **Assess** — Determine scope of exposure and data classification of affected records.
3. **Notify** — If consumer PII is involved (which should not be possible under normal operation), notify affected parties within 72 hours per GDPR Article 33.
4. **Remediate** — Fix the root cause and implement additional safeguards.
5. **Report** — Publish incident report (with data classification details) to the transparency log.

### 12.3 Design for Breach Resilience

Because OTR systems do not persist consumer PII, a data breach of OTR infrastructure would expose only:

- Merchant trust scores (public data, also available via API)
- Aggregate fulfillment metrics (merchant business data)
- Hash chain entries (cryptographic hashes, not reversible)
- Audit log metadata (no content data)

This architecture ensures that even in a worst-case breach scenario, no consumer personal data can be exfiltrated because it is never stored.
