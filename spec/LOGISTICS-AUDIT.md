# OTR Logistics Audit Framework

**Verification of Merchant Fulfillment Data Authenticity**

**Status:** Draft
**Version:** 3.0.0
**Date:** 2026-03-11
**Authors:** ORBEXA <dev@orbexa.io>
**License:** MIT

---

## Table of Contents

1. [Overview](#1-overview)
2. [Threat Model](#2-threat-model)
3. [Audit Architecture](#3-audit-architecture)
4. [Tracking Number Validation](#4-tracking-number-validation)
5. [Logistics Provider Interface](#5-logistics-provider-interface)
6. [Logistics Integrity Score](#6-logistics-integrity-score)
7. [Impact on Trust Score](#7-impact-on-trust-score)
8. [Audit Report Schema](#8-audit-report-schema)
9. [Database Schema](#9-database-schema)
10. [Operational Procedures](#10-operational-procedures)
11. [Privacy Considerations](#11-privacy-considerations)

---

## 1. Overview

In AI agent commerce, autonomous purchasing agents make high-stakes transaction decisions on behalf of users. These agents rely on the OTR trust score to evaluate merchant credibility. A critical component of that credibility is **fulfillment reliability** — whether the merchant actually ships orders and delivers them as promised.

Merchants self-report fulfillment data (tracking numbers, delivery rates, shipping times) to the OTR system. Without independent verification, this data is trivially falsifiable. A fraudulent merchant can claim a 99% delivery rate while shipping nothing, or submit recycled tracking numbers from past legitimate shipments to manufacture the appearance of active fulfillment.

The OTR Logistics Audit Framework addresses this vulnerability by performing **sampling-based independent verification** of merchant fulfillment data against real logistics carrier APIs. It validates that tracking numbers are genuine, that shipment events exist, that delivery timelines are consistent, and that geographic routing aligns with the merchant's claimed location.

### 1.1 Design Principles

1. **Independence** — Audit verification is performed against third-party logistics APIs, not merchant-provided data. The merchant cannot influence the audit outcome.
2. **Sampling efficiency** — Full verification of every order is unnecessary and cost-prohibitive. Statistical sampling provides high-confidence results at a fraction of the cost.
3. **Provider abstraction** — The framework defines a generic logistics provider interface. No single carrier API is required; implementations MAY use any conformant provider.
4. **Proportional scoring** — Audit results produce a continuous integrity score, not a binary pass/fail. Minor discrepancies reduce scores proportionally; systemic fraud collapses them.
5. **Privacy by design** — Order data is transient. Raw tracking details are processed in memory and MUST NOT be persisted beyond the aggregated audit report. See [DATA-DESENSITIZATION.md](DATA-DESENSITIZATION.md).

### 1.2 Scope

The Logistics Audit Framework covers:

- **Tracking number authenticity** — Verifying that submitted tracking numbers are real and recognized by carriers.
- **Shipment event existence** — Confirming that logistics events (pickup, transit, delivery) actually occurred.
- **Timeline consistency** — Checking that shipment timelines align with order dates and reasonable delivery windows.
- **Geographic consistency** — Validating that shipment origins match the merchant's claimed business location.
- **Fraud pattern detection** — Identifying recycled tracking numbers, fake numbers, and phantom shipments.

The framework does NOT cover:

- Product quality verification (OTR does not assess what was shipped, only that something was shipped).
- Return and refund processing (covered by separate policy compliance mechanisms).
- Real-time shipment tracking for end consumers (OTR is a trust assessment system, not a tracking service).

### 1.3 Prerequisites

The Logistics Audit Framework applies ONLY to **Verified Merchants** who have:

1. Integrated with the OTR Merchant API.
2. Provided order and tracking data through the API.
3. Consented to logistics audit as part of the Verified Merchant agreement.

Public Assessment (non-integrated) merchants are not subject to logistics audit, as no order data is available. For these merchants, the Fulfillment dimension relies solely on policy-based signals.

## 2. Threat Model

### 2.1 Fulfillment Fraud Taxonomy

| Fraud Type | Description | Detection Difficulty | Prevalence |
|---|---|---|---|
| **Fake Tracking Numbers** | Merchant submits numbers in valid carrier format that do not exist in any carrier system | Low | High |
| **Recycled Old Numbers** | Merchant reuses tracking numbers from past legitimate shipments by other merchants or from their own old orders | Medium | High |
| **Phantom Shipments** | Merchant creates real labels (generating valid tracking numbers) but never actually ships a package | Medium | Medium |
| **Incomplete Delivery Trails** | Tracking numbers show initial scan events but no delivery confirmation, indicating packages were abandoned in transit | Low | Medium |
| **Geographic Mismatch** | Shipment origin location does not match the merchant's claimed business address, indicating drop-shipping or third-party fulfillment misrepresentation | Medium | Low |
| **Bulk Label Generation** | Merchant generates shipping labels in bulk to produce valid tracking numbers, then voids or never uses them | High | Low |

### 2.2 Adversary Capabilities

| Adversary Profile | Capability | Expected Audit Outcome |
|---|---|---|
| **Naive Scammer** | Generates random strings resembling tracking numbers | Detected immediately via format validation and carrier non-recognition |
| **Recycler** | Collects tracking numbers from public order confirmations or past transactions | Detected via timeline analysis (delivery date precedes order date) |
| **Label Farmer** | Creates real shipping labels via carrier APIs but never ships | Detected via missing transit and delivery events beyond initial label creation |
| **Sophisticated Operator** | Ships low-value or empty packages to generate real tracking events | Partially detectable via geographic and weight inconsistencies; requires cross-validation with other OTR dimensions |

### 2.3 Trust Assumptions

The Logistics Audit Framework assumes:

- **Carrier APIs are authoritative.** Data returned by logistics providers is treated as ground truth. Carrier API compromise is outside the OTR threat model.
- **Sampling is statistically representative.** Random order selection prevents adversaries from predicting which orders will be audited. A 15% sampling rate provides sufficient coverage to detect systematic fraud.
- **Temporal ordering is reliable.** Carrier event timestamps are accurate to within 24 hours. Clock skew beyond this threshold is treated as anomalous.

## 3. Audit Architecture

### 3.1 Sampling Strategy

The audit system uses **random sampling** to select orders for verification. This approach prevents merchants from gaming the system by fulfilling only the orders they expect to be audited.

**Sampling parameters:**

| Parameter | Default Value | Rationale |
|---|---|---|
| `samplingRate` | 0.15 (15%) | Balances verification confidence against API cost. At 15%, a merchant with 100 orders has approximately 15 orders audited. |
| `minSamples` | 5 | Ensures statistical minimum even for low-volume merchants. Fewer than 5 samples provides insufficient confidence. |
| `maxSamples` | 50 | Caps API usage for high-volume merchants. 50 samples from a 10,000-order merchant still provides strong statistical confidence. |

**Sampling procedure:**

1. Query the `merchant_order_tracking` table for all orders belonging to the target merchant domain where `tracking_number IS NOT NULL AND tracking_number != ''`.
2. Apply `ORDER BY RANDOM()` to ensure unpredictable selection.
3. Compute the effective sample size as `max(minSamples, floor(totalOrders * samplingRate))`, capped at `maxSamples`.
4. Select the first N rows from the randomized result set.

Implementations MUST use a cryptographically secure random ordering to prevent prediction attacks. Database-level `RANDOM()` functions (e.g., PostgreSQL `RANDOM()`) are acceptable.

### 3.2 Audit Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                     OTR Logistics Audit Pipeline                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Step 1: Sample Selection                                             │
│  ├── Query merchant_order_tracking for domain                        │
│  ├── Randomize order, apply sampling rate                            │
│  └── Produce sample set S = { (trackingNumber, carrier, orderDate) } │
│                                                                       │
│  Step 2: Per-Number Validation                                        │
│  ├── For each (tn, carrier, orderDate) in S:                         │
│  │   ├── Detect carrier (if not provided)                            │
│  │   ├── Validate tracking number format                             │
│  │   ├── Query carrier for tracking events                           │
│  │   ├── Check event existence and completeness                      │
│  │   ├── Validate timeline consistency against orderDate             │
│  │   ├── Check geographic consistency against merchant location      │
│  │   ├── Detect recycled number (delivery < orderDate)               │
│  │   └── Detect fake number (valid format, no carrier recognition)   │
│  │                                                                    │
│  │   Output: TrackingValidation per number                           │
│  │                                                                    │
│  Step 3: Metric Aggregation                                           │
│  ├── Compute trackingValidRate                                       │
│  ├── Compute trackingEventCompleteRate                               │
│  ├── Compute deliveryTimeAccuracy                                    │
│  ├── Compute geoConsistencyRate                                      │
│  ├── Count recycledNumbersDetected                                   │
│  ├── Count fakeNumbersDetected                                       │
│  └── Calculate logisticsIntegrityScore                               │
│                                                                       │
│  Step 4: Report Persistence                                           │
│  ├── Write LogisticsAuditReport to otr_logistics_audit               │
│  └── Feed integrity score into Fulfillment dimension                 │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3 Failure Handling

Individual tracking number validation failures MUST NOT abort the entire audit. When a single validation call fails (network error, provider timeout, rate limiting), the system MUST:

1. Record the tracking number as a failed validation with `isValid: false`, `isFake: true` as a conservative default.
2. Continue processing remaining tracking numbers in the sample set.
3. Include the failed validation in metric calculations.

This conservative approach ensures that provider outages do not create a loophole where merchants benefit from unverifiable numbers. If a significant proportion of validations fail due to provider issues (rather than genuinely fake numbers), the operator SHOULD re-run the audit after provider recovery.

## 4. Tracking Number Validation

Each sampled tracking number undergoes a multi-step validation process. The validation produces a `TrackingValidation` result that captures all findings for that number.

### 4.1 Format Validation

Tracking number format MUST be validated against known carrier patterns before querying any external API. This is a fast, local check that eliminates obviously invalid numbers.

Common carrier format patterns:

| Carrier | Pattern | Example |
|---|---|---|
| USPS | 20-22 digits, or 13 chars starting with specific prefixes | 9400111899223033005282 |
| UPS | 1Z + 6 alphanumeric + 2 digits + 8 digits | 1Z999AA10123456784 |
| FedEx | 12, 15, 20, or 22 digits | 794644790138 |
| DHL | 10-digit numeric, or JD + 18 digits | 1234567890 |
| China Post | 13 chars: 2 letters + 9 digits + 2 letters (e.g., RA, RB, RC, EMS) | RA123456789CN |
| Cainiao | LP + 14 digits | LP12345678901234 |
| Royal Mail | 2 alpha + 9 digits + 2 alpha | AB123456789GB |
| Japan Post | 2 alpha + 9 digits + 2 alpha | EC123456789JP |

Numbers that do not match any known carrier pattern SHOULD be flagged but MUST still be submitted to the logistics provider for verification, as carrier format databases may be incomplete.

### 4.2 Event Existence Verification

After format validation, the tracking number is submitted to the logistics provider to retrieve tracking events. A legitimate shipment MUST have at least one event (label creation, pickup, or scan).

| Event Count | Interpretation | Score Impact |
|---|---|---|
| 0 events | No carrier recognition — likely fake or phantom | `hasEvents: false`, contributes to fake detection |
| 1 event (label only) | Label created but no movement — possible phantom shipment | `hasEvents: true` but suspicious |
| 2+ events | Active shipment with transit history | `hasEvents: true`, normal |
| 5+ events with delivery | Complete shipment lifecycle | `hasEvents: true`, `isDelivered: true` |

### 4.3 Timeline Consistency

Timeline validation checks that the shipment timeline is logically consistent with the order date.

**Rules:**

1. **Pickup MUST occur after order date.** `firstEventAt >= orderDate`. A first event that precedes the order date by more than 24 hours indicates a recycled tracking number.
2. **Delivery SHOULD occur within a reasonable window.** For domestic shipments, delivery within 30 days of order is expected. For international shipments, up to 90 days is reasonable.
3. **Events MUST be chronologically ordered.** `firstEventAt <= lastEventAt`. Reversed timestamps indicate data corruption or fabrication.

**Recycled number detection logic:**

```
if (lastEventAt !== null && orderDate !== null) {
    if (parseDate(lastEventAt) < parseDate(orderDate)) {
        // Delivery occurred BEFORE this order was placed
        // This tracking number was recycled from an older shipment
        isRecycled = true;
    }
}
```

A recycled tracking number is a strong fraud indicator. Merchants MUST NOT submit tracking numbers from orders unrelated to the current assessment period.

### 4.4 Geographic Consistency

Geographic consistency validation checks that the shipment origin location is compatible with the merchant's claimed business address.

**Procedure:**

1. Extract the location from the first logistics event (pickup or first scan).
2. Compare against the merchant's registered business address (country and region level).
3. Flag as inconsistent if the origin country does not match and no declared warehouse or fulfillment center addresses explain the discrepancy.

Geographic inconsistency alone is NOT a fraud indicator — many legitimate merchants use third-party fulfillment centers, drop-shipping arrangements, or international warehouses. However, persistent geographic mismatches combined with other anomalies (recycled numbers, missing events) amplify the fraud signal.

### 4.5 Fake Number Detection

A tracking number is classified as fake when it meets ALL of the following criteria:

1. The number passes basic format validation (appears to be a real tracking number).
2. No logistics provider recognizes the number.
3. No carrier can be detected, or the detected carrier returns no record.

Fake numbers indicate that the merchant fabricated tracking data without even creating shipping labels. This is the most basic form of fulfillment fraud.

### 4.6 Validation Result Structure

Each tracking number validation produces a `TrackingValidation` object:

```typescript
interface TrackingValidation {
  trackingNumber: string;    // The number that was validated
  carrier: string;           // Detected or claimed carrier
  isValid: boolean;          // Carrier recognizes this number
  hasEvents: boolean;        // At least one logistics event exists
  eventCount: number;        // Total number of logistics events
  firstEventAt: string | null;  // ISO 8601 timestamp of first event
  lastEventAt: string | null;   // ISO 8601 timestamp of last event
  isDelivered: boolean;      // Delivery confirmation exists
  isRecycled: boolean;       // Detected as recycled old number
  isFake: boolean;           // Detected as fabricated number
}
```

The `isRecycled` and `isFake` flags are mutually exclusive in practice: a recycled number is a real number (previously valid), while a fake number never existed. Both contribute negative signals to the integrity score, but with different penalty weights reflecting their different fraud severity.

## 5. Logistics Provider Interface

The OTR Logistics Audit Framework defines an abstract provider interface to decouple the audit logic from any specific logistics API vendor. Implementations MUST conform to this interface.

### 5.1 Interface Definition

```typescript
/** Abstract logistics provider — implementations MUST satisfy this interface */
interface LogisticsProvider {
  /** Provider display name (e.g., "17Track", "EasyPost") */
  name: string;

  /**
   * Validate a tracking number against carrier records.
   *
   * MUST return a complete TrackingValidation including event metadata
   * and fraud detection flags (isRecycled, isFake).
   *
   * If carrier is not provided, the implementation SHOULD attempt
   * auto-detection via detectCarrier().
   */
  validateTrackingNumber(
    trackingNumber: string,
    carrier?: string
  ): Promise<TrackingValidation>;

  /**
   * Retrieve the full event trail for a tracking number.
   *
   * Returns an ordered array of TrackingEvent, sorted chronologically
   * from earliest to latest. Returns an empty array if the tracking
   * number is not recognized.
   */
  getTrackingEvents(trackingNumber: string): Promise<TrackingEvent[]>;

  /**
   * Auto-detect the carrier for a tracking number.
   *
   * Uses format pattern matching and/or API-based detection.
   * Returns a confidence score indicating detection reliability.
   */
  detectCarrier(trackingNumber: string): Promise<CarrierDetection>;
}

/** Individual logistics event */
interface TrackingEvent {
  timestamp: string;       // ISO 8601 timestamp
  location: string;        // Human-readable location
  status: string;          // Carrier-specific status code
  description: string;     // Human-readable event description
}

/** Carrier auto-detection result */
interface CarrierDetection {
  carrier: string;         // Canonical carrier identifier
  confidence: number;      // Detection confidence [0.0, 1.0]
  country: string;         // Carrier's primary country (ISO 3166-1 alpha-2)
}
```

### 5.2 Built-in Provider Implementations

OTR reference implementations SHOULD include adapters for the following logistics aggregation APIs:

| Provider | Coverage | Strengths | Limitations |
|---|---|---|---|
| **17Track** | 2,000+ carriers worldwide | Excellent China/Asia coverage, cost-effective | Rate limits on free tier |
| **EasyPost** | 100+ carriers, primarily US/EU | High reliability, detailed event data | Higher per-query cost |
| **AfterShip** | 1,100+ carriers worldwide | Comprehensive API, webhook support | Enterprise pricing for high volume |
| **TrackingMore** | 1,200+ carriers worldwide | Good price/coverage ratio | Variable response times |

Implementations MAY use a single provider or a cascading strategy where a primary provider is queried first and a secondary provider is used as fallback. The choice of provider does NOT affect the audit algorithm or scoring formula.

### 5.3 Provider Selection Criteria

When selecting a logistics provider for an OTR implementation, operators SHOULD consider:

1. **Carrier coverage** — The provider MUST support carriers relevant to the merchant's shipping geography.
2. **Data freshness** — Event data SHOULD reflect carrier updates within 4 hours.
3. **Rate limits** — The provider MUST support the audit's query volume (up to `maxSamples` queries per merchant per audit cycle).
4. **Response format** — The provider's response MUST be mappable to the `TrackingValidation` and `TrackingEvent` interfaces without information loss.

### 5.4 Provider Failover

If the primary provider is unavailable, implementations SHOULD fall back to secondary providers:

```
1. Query primary provider (e.g., 17Track)
2. If unavailable or rate-limited:
   a. Query secondary provider (e.g., AfterShip)
   b. If also unavailable:
      i.  Queue for retry (max 3 retries over 24 hours)
      ii. If all retries fail: mark validation as failed (conservative default)
```

Provider failover MUST be transparent to the audit algorithm. The `LogisticsProvider` interface abstracts all failover logic; the audit function receives a single provider instance.

## 6. Logistics Integrity Score

The Logistics Integrity Score is a composite metric that quantifies the trustworthiness of a merchant's fulfillment data based on audit results. The score is computed from four positive factors and two penalty factors.

### 6.1 Score Formula

```
logisticsIntegrityScore = clamp(
    trackingValidRate         * 30
  + trackingEventCompleteRate * 30
  + deliveryTimeAccuracy      * 25
  + geoConsistencyRate        * 15
  - recycledNumberRate        * 20
  - fakeNumberRate            * 30
, 0, 100)
```

The result MUST be rounded to the nearest integer and clamped to the range [0, 100].

### 6.2 Factor Definitions

| Factor | Weight | Range | Definition |
|---|---|---|---|
| `trackingValidRate` | +30 | [0.0, 1.0] | Proportion of sampled tracking numbers recognized as valid by the carrier |
| `trackingEventCompleteRate` | +30 | [0.0, 1.0] | Proportion of sampled tracking numbers that have at least one logistics event |
| `deliveryTimeAccuracy` | +25 | [0.0, 1.0] | Proportion of sampled tracking numbers with a confirmed delivery status |
| `geoConsistencyRate` | +15 | [0.0, 1.0] | Proportion of sampled tracking numbers where shipment origin is geographically consistent with the merchant's location |
| `recycledNumberRate` | -20 (penalty) | [0.0, 1.0] | Proportion of sampled tracking numbers detected as recycled from older shipments |
| `fakeNumberRate` | -30 (penalty) | [0.0, 1.0] | Proportion of sampled tracking numbers detected as fabricated |

### 6.3 Factor Calculations

```
trackingValidRate         = count(isValid == true)     / totalOrdersSampled
trackingEventCompleteRate = count(hasEvents == true)    / totalOrdersSampled
deliveryTimeAccuracy      = count(isDelivered == true)  / totalOrdersSampled
geoConsistencyRate        = count(geoConsistent == true) / totalOrdersSampled
recycledNumberRate        = count(isRecycled == true)   / totalOrdersSampled
fakeNumberRate            = count(isFake == true)       / totalOrdersSampled
```

All rates MUST be computed to 4 decimal places using standard rounding: `round(value * 10000) / 10000`.

### 6.4 Weight Rationale

- **Tracking validity (30)** and **event completeness (30)** carry the highest positive weights because they represent the most fundamental verification: does this tracking number exist and does it have real logistics activity?
- **Delivery accuracy (25)** is weighted slightly lower because some legitimate shipments may be in transit at audit time and not yet delivered.
- **Geographic consistency (15)** carries the lowest positive weight because geographic mismatches have legitimate explanations (fulfillment centers, drop-shipping).
- **Fake number penalty (30)** is the most severe penalty because fake numbers indicate deliberate fabrication with no legitimate explanation.
- **Recycled number penalty (20)** is slightly less severe because recycled numbers at least correspond to real shipments, even if they are being dishonestly reused.

### 6.5 Score Interpretation

| Score Range | Interpretation | Recommended Action |
|---|---|---|
| 85 - 100 | Excellent fulfillment integrity | No action required |
| 70 - 84 | Good integrity with minor issues | Monitor on subsequent audits |
| 50 - 69 | Moderate issues detected | Flag for review; increase sampling rate on next audit |
| 25 - 49 | Significant integrity concerns | Reduce Fulfillment dimension score; notify merchant |
| 0 - 24 | Systemic fulfillment fraud likely | Apply severe Fulfillment penalty; escalate for manual review |

### 6.6 Score Examples

**Example 1: Legitimate merchant with strong fulfillment**

```
totalOrdersSampled: 20
trackingValidRate:         1.0000  (20/20 valid)
trackingEventCompleteRate: 0.9500  (19/20 have events)
deliveryTimeAccuracy:      0.9000  (18/20 delivered)
geoConsistencyRate:        1.0000  (20/20 consistent)
recycledNumberRate:        0.0000  (0 recycled)
fakeNumberRate:            0.0000  (0 fake)

Score = 1.0*30 + 0.95*30 + 0.90*25 + 1.0*15 - 0.0*20 - 0.0*30
     = 30 + 28.5 + 22.5 + 15 - 0 - 0
     = 96 → clamped to 96
```

**Example 2: Merchant with recycled tracking numbers**

```
totalOrdersSampled: 15
trackingValidRate:         0.8000  (12/15 valid)
trackingEventCompleteRate: 0.7333  (11/15 have events)
deliveryTimeAccuracy:      0.5333  (8/15 delivered)
geoConsistencyRate:        0.8000  (12/15 consistent)
recycledNumberRate:        0.2000  (3/15 recycled)
fakeNumberRate:            0.0000  (0 fake)

Score = 0.80*30 + 0.73*30 + 0.53*25 + 0.80*15 - 0.20*20 - 0.0*30
     = 24 + 21.9 + 13.25 + 12 - 4 - 0
     = 67.15 → rounded to 67
```

**Example 3: Fraudulent merchant with fake numbers**

```
totalOrdersSampled: 10
trackingValidRate:         0.3000  (3/10 valid)
trackingEventCompleteRate: 0.2000  (2/10 have events)
deliveryTimeAccuracy:      0.1000  (1/10 delivered)
geoConsistencyRate:        0.3000  (3/10 consistent)
recycledNumberRate:        0.1000  (1/10 recycled)
fakeNumberRate:            0.5000  (5/10 fake)

Score = 0.30*30 + 0.20*30 + 0.10*25 + 0.30*15 - 0.10*20 - 0.50*30
     = 9 + 6 + 2.5 + 4.5 - 2 - 15
     = 5 → clamped to 5
```

## 7. Impact on Trust Score

Logistics audit results affect the OTR composite trust score through two dimensions: **Fulfillment** and **DataQuality**.

### 7.1 Fulfillment Dimension

The Fulfillment dimension measures a merchant's ability to reliably deliver purchased goods. Without logistics auditing, this dimension relies entirely on merchant self-reported data (claimed delivery rate, claimed shipping speed).

When a logistics audit has been performed, audit-verified data **replaces** merchant self-reported data:

| Fulfillment Signal | Without Audit | With Audit |
|---|---|---|
| Delivery rate | Merchant-claimed value | `deliveryTimeAccuracy` from audit |
| Tracking validity | Assumed valid | `trackingValidRate` from audit |
| Shipping completeness | Merchant-claimed value | `trackingEventCompleteRate` from audit |

The `logisticsIntegrityScore` MAY be used directly as the Fulfillment dimension score, or it MAY be blended with other fulfillment signals (e.g., return rate data, customer complaint data) according to the implementation's scoring weights.

### 7.2 DataQuality Dimension

The DataQuality dimension measures the accuracy and completeness of data a merchant provides to the OTR system. Logistics auditing contributes to DataQuality by **cross-validating** merchant claims against independently verified data.

When the audit reveals discrepancies between merchant-reported fulfillment data and independently verified results, a **discount multiplier** is applied to the DataQuality dimension:

| Discrepancy Level | Condition | Multiplier |
|---|---|---|
| None | Merchant-reported and audit data agree within 5% | 1.0 (no adjustment) |
| Minor | Discrepancy between 5% and 15% | 0.8 |
| Moderate | Discrepancy between 15% and 30% | 0.65 |
| Severe | Discrepancy exceeds 30% | 0.5 |

**Discrepancy calculation:**

```
discrepancy = abs(merchantClaimedDeliveryRate - auditVerifiedDeliveryRate)

if (discrepancy <= 0.05) multiplier = 1.0
else if (discrepancy <= 0.15) multiplier = 0.8
else if (discrepancy <= 0.30) multiplier = 0.65
else multiplier = 0.5
```

This ensures that merchants who inflate their self-reported fulfillment metrics are penalized not only in the Fulfillment dimension (where audit data replaces their claims) but also in the DataQuality dimension (where the act of misreporting is itself penalized).

### 7.3 Interaction with Anti-Gaming Framework

Logistics audit results operate independently of the Anti-Gaming Framework (see [ANTI-FRAUD-FRAMEWORK.md](ANTI-FRAUD-FRAMEWORK.md)). The Fulfillment dimension is classified as **not gameable** because it requires real shipping activity that cannot be faked at scale. Therefore:

- Anti-gaming multipliers do NOT apply to the Fulfillment dimension.
- Anti-gaming multipliers do NOT apply to the DataQuality dimension.
- The logistics integrity score is immune to domain age gates and time clustering detection.

However, a very low logistics integrity score (< 25) combined with anti-gaming `LIKELY_GAMING` severity SHOULD trigger elevated scrutiny, as it may indicate a comprehensive fraud operation.

### 7.4 Score Impact Examples

**Scenario A: Honest merchant, audit confirms claims**

```
Merchant-claimed delivery rate: 92%
Audit-verified deliveryTimeAccuracy: 0.90 (90%)
Discrepancy: |0.92 - 0.90| = 0.02 → multiplier = 1.0 (within 5%)

Result: Fulfillment dimension uses audit-verified 90%.
        DataQuality dimension unaffected.
```

**Scenario B: Merchant inflates delivery rate**

```
Merchant-claimed delivery rate: 95%
Audit-verified deliveryTimeAccuracy: 0.53 (53%)
Discrepancy: |0.95 - 0.53| = 0.42 → multiplier = 0.5 (severe)

Result: Fulfillment dimension uses audit-verified 53%.
        DataQuality dimension reduced by ×0.5.
        Double penalty for systematic misrepresentation.
```

## 8. Audit Report Schema

The `LogisticsAuditReport` captures all results from a single audit execution. Implementations MUST persist this report for auditability and historical trend analysis.

### 8.1 Report Interface

```typescript
interface LogisticsAuditReport {
  /** Merchant domain that was audited */
  domain: string;

  /** Audit type: SAMPLING for standard audits, FULL for complete verification */
  auditType: "SAMPLING" | "FULL";

  /** Number of orders selected and validated in this audit */
  totalOrdersSampled: number;

  /** Proportion of tracking numbers recognized as valid [0.0, 1.0] */
  trackingValidRate: number;

  /** Proportion of tracking numbers with at least one logistics event [0.0, 1.0] */
  trackingEventCompleteRate: number;

  /** Proportion of tracking numbers with geographic consistency [0.0, 1.0] */
  geoConsistencyRate: number;

  /** Proportion of tracking numbers with confirmed delivery [0.0, 1.0] */
  deliveryTimeAccuracy: number;

  /** Count of tracking numbers detected as recycled from older shipments */
  recycledNumbersDetected: number;

  /** Count of tracking numbers detected as fabricated */
  fakeNumbersDetected: number;

  /** Composite logistics integrity score [0, 100] */
  logisticsIntegrityScore: number;

  /** ISO 8601 timestamp of when the audit was performed */
  auditedAt: string;

  /** Per-number validation details (transient; SHOULD be purged after 30 days) */
  details: TrackingValidation[];
}
```

### 8.2 Field Constraints

| Field | Type | Constraint |
|---|---|---|
| `domain` | string | MUST be a valid, registered domain name |
| `auditType` | enum | MUST be either `"SAMPLING"` or `"FULL"` |
| `totalOrdersSampled` | integer | MUST be >= 0 |
| `trackingValidRate` | number | MUST be in [0.0, 1.0], 4 decimal places |
| `trackingEventCompleteRate` | number | MUST be in [0.0, 1.0], 4 decimal places |
| `geoConsistencyRate` | number | MUST be in [0.0, 1.0], 4 decimal places |
| `deliveryTimeAccuracy` | number | MUST be in [0.0, 1.0], 4 decimal places |
| `recycledNumbersDetected` | integer | MUST be >= 0 |
| `fakeNumbersDetected` | integer | MUST be >= 0 |
| `logisticsIntegrityScore` | integer | MUST be in [0, 100] |
| `auditedAt` | string | MUST be a valid ISO 8601 timestamp with timezone |
| `details` | array | MAY be empty; SHOULD be redacted before long-term storage |

### 8.3 Empty Report

When a merchant has no tracking numbers available for auditing (new merchant, no order data synced), the audit MUST return an empty report with all rates set to `0` and `totalOrdersSampled: 0`. An empty report MUST NOT be treated as a negative signal — it indicates insufficient data rather than fraud.

## 9. Database Schema

Audit reports are persisted in the `otr_logistics_audit` table. This table stores one row per audit execution per merchant domain.

### 9.1 Table Definition

```sql
CREATE TABLE otr_logistics_audit (
    id                           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    domain                       TEXT NOT NULL,
    audit_type                   TEXT NOT NULL DEFAULT 'SAMPLING'
                                 CHECK (audit_type IN ('SAMPLING', 'FULL')),
    total_orders_sampled         INTEGER NOT NULL DEFAULT 0,

    -- Audit metric rates (stored as NUMERIC with 4 decimal places)
    tracking_valid_rate          NUMERIC(5, 4) NOT NULL DEFAULT 0,
    tracking_event_complete_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
    geo_consistency_rate         NUMERIC(5, 4) NOT NULL DEFAULT 0,
    delivery_time_accuracy       NUMERIC(5, 4) NOT NULL DEFAULT 0,

    -- Fraud detection counts
    recycled_numbers_detected    INTEGER NOT NULL DEFAULT 0,
    fake_numbers_detected        INTEGER NOT NULL DEFAULT 0,

    -- Composite score and raw validation details
    raw_results                  JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Data integrity constraints
    CONSTRAINT valid_rates CHECK (
        tracking_valid_rate          BETWEEN 0 AND 1
        AND tracking_event_complete_rate BETWEEN 0 AND 1
        AND geo_consistency_rate         BETWEEN 0 AND 1
        AND delivery_time_accuracy       BETWEEN 0 AND 1
    )
);

-- Index for merchant-specific audit history lookups
CREATE INDEX idx_logistics_audit_domain
    ON otr_logistics_audit (domain);

-- Index for time-range queries (audit trend analysis)
CREATE INDEX idx_logistics_audit_created
    ON otr_logistics_audit (created_at DESC);

-- Composite index for domain + time range queries
CREATE INDEX idx_logistics_audit_domain_time
    ON otr_logistics_audit (domain, created_at DESC);
```

### 9.2 Column Mapping

| Column | Report Field | Description |
|---|---|---|
| `domain` | `domain` | Merchant domain that was audited |
| `audit_type` | `auditType` | `SAMPLING` or `FULL` |
| `total_orders_sampled` | `totalOrdersSampled` | Number of orders audited |
| `tracking_valid_rate` | `trackingValidRate` | Valid tracking number proportion |
| `tracking_event_complete_rate` | `trackingEventCompleteRate` | Event completeness proportion |
| `geo_consistency_rate` | `geoConsistencyRate` | Geographic consistency proportion |
| `delivery_time_accuracy` | `deliveryTimeAccuracy` | Confirmed delivery proportion |
| `recycled_numbers_detected` | `recycledNumbersDetected` | Recycled number count |
| `fake_numbers_detected` | `fakeNumbersDetected` | Fake number count |
| `raw_results` | `logisticsIntegrityScore` + `details` | JSONB containing composite score and per-number details |
| `created_at` | `auditedAt` | Audit execution timestamp |

### 9.3 The raw_results JSONB Structure

The `raw_results` column stores the computed integrity score and optionally the per-number validation details:

```json
{
  "logisticsIntegrityScore": 67,
  "details": [
    {
      "trackingNumber": "1Z999AA10123456784",
      "carrier": "UPS",
      "isValid": true,
      "hasEvents": true,
      "eventCount": 7,
      "firstEventAt": "2026-03-01T10:00:00Z",
      "lastEventAt": "2026-03-05T14:30:00Z",
      "isDelivered": true,
      "isRecycled": false,
      "isFake": false
    }
  ]
}
```

### 9.4 Data Retention

Audit report rows MUST be retained for a minimum of **12 months** for trend analysis and dispute resolution. The `raw_results` JSONB field, which MAY contain per-number validation details, SHOULD have its `details` array purged (set to `[]`) after **30 days** to comply with data minimization requirements (see [DATA-DESENSITIZATION.md](DATA-DESENSITIZATION.md)).

Implementations SHOULD run a scheduled cleanup job:

```sql
UPDATE otr_logistics_audit
SET raw_results = raw_results - 'details' || '{"details": []}'::jsonb
WHERE created_at < NOW() - INTERVAL '30 days'
  AND raw_results -> 'details' != '[]'::jsonb;
```

## 10. Operational Procedures

### 10.1 Audit Triggers

Logistics audits SHOULD be triggered under the following conditions:

| Trigger | Description | Recommended Config |
|---|---|---|
| **Periodic** | Scheduled audit as part of regular trust reassessment | Every 7-14 days for Verified Merchants |
| **Initial verification** | First audit when a merchant opts in to Verified Merchant status | Immediately upon data sync completion |
| **Score change** | Re-audit after significant fulfillment metric changes | When merchant-reported delivery rate changes by > 10% |
| **Manual escalation** | Operator-initiated audit in response to complaints or anomalies | On demand |
| **Post-fraud detection** | Re-audit after anti-fraud framework flags the merchant | Immediately, with increased sampling rate |

### 10.2 Audit Frequency Recommendations

| Merchant Category | Recommended Frequency | Sampling Rate | Rationale |
|---|---|---|---|
| New Verified Merchant (< 3 months) | Weekly | 0.20 (20%) | Intensive monitoring during establishment period |
| Established Verified Merchant (3-12 months) | Bi-weekly | 0.15 (15%) | Standard monitoring cadence |
| Long-standing Verified Merchant (> 12 months) | Monthly | 0.10 (10%) | Reduced frequency for proven merchants |
| Flagged or post-incident | Daily for 7 days, then weekly | 0.25 (25%) | Heightened scrutiny after detected anomalies |

### 10.3 Audit Invocation

The audit function is invoked with the following signature:

```typescript
async function runLogisticsAudit(
  sql: Sql,
  domain: string,
  provider: LogisticsProvider,
  config?: Partial<AuditConfig>
): Promise<LogisticsAuditReport>
```

**Parameters:**

| Parameter | Required | Description |
|---|---|---|
| `sql` | Yes | Database connection (Postgres client) |
| `domain` | Yes | Merchant domain to audit |
| `provider` | Yes | Logistics provider implementation to use for validation |
| `config` | No | Override default sampling parameters (`samplingRate`, `minSamples`, `maxSamples`) |

**Example invocation:**

```typescript
const report = await runLogisticsAudit(
  sql,
  "example-store.com",
  seventeenTrackProvider,
  { samplingRate: 0.20, minSamples: 10 }
);

console.log(report.logisticsIntegrityScore); // 0-100
console.log(report.fakeNumbersDetected);     // Count of fake numbers
```

### 10.4 Monitoring and Alerting

Operators SHOULD monitor the following metrics across all audit executions:

| Metric | Alert Threshold | Action |
|---|---|---|
| Average logistics integrity score (24h rolling) | Drops below 60 | Investigate whether a provider issue or genuine fraud spike |
| Individual merchant score | Drops below 25 | Flag merchant for manual review |
| Provider API error rate | Exceeds 10% | Switch to backup provider or pause audits |
| Audit execution time | Exceeds 5 minutes per merchant | Investigate provider latency; consider reducing `maxSamples` |
| Fake number detection rate (platform-wide) | Exceeds 5% | Investigate whether a new fraud pattern is emerging |

### 10.5 Merchant Notification

Merchants SHOULD be notified of logistics audit results through the merchant dashboard:

- **Score and component breakdown** — Visible after each audit cycle.
- **Failing validation summary** — Aggregate counts of invalid, recycled, and fake numbers (without exposing specific tracking numbers of other merchants).
- **Improvement guidance** — Actionable recommendations for improving logistics integrity.
- **Dispute mechanism** — Merchants MAY provide evidence for tracking numbers that failed validation (e.g., carrier system delays, warehouse transfers). Disputes are reviewed manually and do not automatically modify audit results.

## 11. Privacy Considerations

Logistics auditing inherently involves transient access to order-level data, including tracking numbers that may be linkable to individual consumers. The OTR system MUST handle this data with strict privacy controls.

### 11.1 Data Minimization

The audit system collects ONLY the following fields from merchant order data:

| Field | Purpose | PII Classification |
|---|---|---|
| `tracking_number` | Primary audit subject | Pseudonymous (linkable to shipment, not directly to person) |
| `carrier` | Used for carrier-specific validation | Not PII |
| `order_date` | Used for timeline consistency checks | Not PII |

The audit system MUST NOT access or store:

- Consumer names
- Consumer addresses (shipping or billing)
- Consumer email addresses
- Consumer phone numbers
- Order amounts or payment details
- Product details or SKUs

### 11.2 Desensitization Levels

Logistics audit data flows through the four-level desensitization architecture defined in [DATA-DESENSITIZATION.md](DATA-DESENSITIZATION.md):

| Level | Application to Logistics Audit |
|---|---|
| **Level 1: Pre-Transmission** | Merchant integration layer MUST strip all consumer PII before transmitting order tracking data to the OTR system. Only `tracking_number`, `carrier`, and `order_date` are transmitted. |
| **Level 2: Transport** | All data in transit MUST be encrypted via TLS 1.3. Tracking numbers SHOULD be transmitted over authenticated channels with HMAC integrity verification. |
| **Level 3: Server-Side Aggregation** | Individual `TrackingValidation` results are aggregated into rates immediately. Raw per-number details are stored transiently in the `raw_results` JSONB field and MUST be purged within 30 days. |
| **Level 4: Audit Logging** | Audit logs record only the merchant domain, audit type, aggregate metrics, and composite score. Individual tracking numbers MUST NOT appear in system audit logs. |

### 11.3 GDPR Compliance

Under GDPR, tracking numbers MAY constitute pseudonymous data when linkable to a natural person. The OTR system mitigates this risk through:

1. **Purpose limitation** — Tracking numbers are processed solely for merchant trust assessment, not for consumer profiling or marketing.
2. **Storage limitation** — Per-number details are purged within 30 days. Aggregate rates (which cannot be linked to individuals) are retained for 12 months.
3. **Data processor obligations** — The OTR system acts as a data processor when handling tracking numbers. A Data Processing Agreement (DPA) SHOULD be established with merchants who provide order data.
4. **Right to erasure** — If a consumer exercises their right to erasure against the merchant, and the merchant notifies the OTR system, any stored tracking details associated with that consumer's orders MUST be deleted within 72 hours.

### 11.4 Cross-Border Data Transfer

When logistics provider APIs are hosted outside the merchant's jurisdiction, tracking number queries constitute cross-border data transfers. Implementations MUST ensure that:

1. The logistics provider's data processing terms are compatible with the applicable privacy regulation (GDPR, CCPA, PIPL, etc.).
2. Standard Contractual Clauses (SCCs) or equivalent transfer mechanisms are in place where required.
3. Tracking numbers are not cached or retained by the logistics provider beyond the query response lifecycle.

### 11.5 Tracking Number Handling in Logs

Tracking numbers MUST NOT appear in:

- Application logs (stdout/stderr)
- Error reporting systems (Sentry, Datadog, etc.)
- Network access logs
- Debug output

If tracking numbers must be referenced in diagnostic contexts, they MUST be truncated to the first 4 and last 2 characters with the middle replaced by asterisks (e.g., `1Z99**84`).

---

*This specification is part of the [OTR Protocol v3.0](OTR-SPEC-v3.md). For the complete trust scoring algorithm, see [SCORING-ALGORITHM-v3.md](SCORING-ALGORITHM-v3.md). For anti-fraud detection, see [ANTI-FRAUD-FRAMEWORK.md](ANTI-FRAUD-FRAMEWORK.md). For data protection details, see [DATA-DESENSITIZATION.md](DATA-DESENSITIZATION.md).*
