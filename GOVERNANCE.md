# OTR Protocol Governance

## Overview

The Open Trust Registry (OTR) Protocol is governed by an open, transparent model designed to maintain scoring independence, prevent capture by any single entity, and ensure that merchant trust assessments remain fair and algorithmically driven.

This document describes the governance structure, decision-making processes, roles, and policies that guide the evolution of the OTR Protocol.

## Core Principles

### 1. Algorithmic Independence

OTR scores are computed using **deterministic, open-source algorithms**. No entity -- including ORBEXA -- can manually override, adjust, or influence individual trust scores. The algorithm is the sole authority.

### 2. Scoring Fairness

- Scores cannot be purchased or influenced through commercial relationships
- Whether a merchant is an ORBEXA SaaS subscriber has **no impact** on their OTR score
- All scoring changes require a public RFC proposal and community review
- No hidden weights, secret adjustments, or proprietary scoring factors

### 3. Open Development

- All protocol changes are proposed via public RFCs
- Scoring algorithm changes require updated conformance tests
- Breaking changes follow semantic versioning with deprecation periods
- All discussions happen in the open (GitHub Issues, Discussions, PRs)

### 4. Stakeholder Neutrality

No single organization, industry group, or commercial entity may gain disproportionate influence over the protocol. Governance structures are designed to balance the interests of merchants, AI agent developers, consumers, and validators.

---

## Roles and Responsibilities

### Maintainers

Maintainers are responsible for the day-to-day stewardship of the OTR Protocol. They review and merge contributions, manage releases, and ensure conformance test integrity.

**Responsibilities:**
- Review and approve pull requests
- Manage the RFC process and facilitate community discussion
- Coordinate releases across all packages
- Maintain conformance test vectors
- Enforce the Code of Conduct

**Current maintainers are listed in the [MAINTAINERS](MAINTAINERS) file.**

To become a maintainer, an individual must:
1. Have a sustained track record of high-quality contributions (6+ months)
2. Demonstrate deep understanding of the scoring algorithm and protocol design
3. Be nominated by an existing maintainer
4. Receive consensus approval from the existing maintainer group

### Contributors

Contributors are anyone who participates in the project through code, documentation, bug reports, discussions, or other means.

**How to contribute:**
- Submit bug reports and feature requests via GitHub Issues
- Propose protocol changes via the RFC process
- Submit pull requests for code and documentation improvements
- Participate in RFC discussions and community governance votes
- Write conformance test implementations in new languages

All contributors must adhere to the [Code of Conduct](CODE_OF_CONDUCT.md).

### Validators

Validators are organizations that operate independent OTR scoring infrastructure. In the current phase, ORBEXA is the sole validator. As the protocol matures, the validator network will expand through a formal accreditation process.

**Validator responsibilities:**
- Run conformance-compliant OTR scoring infrastructure
- Maintain high availability and data freshness
- Publish audit logs of scoring operations
- Participate in multi-validator consensus (when available)
- Report protocol issues and contribute improvements

---

## Decision-Making Process

### RFC Process

All significant changes to the OTR Protocol follow a structured RFC (Request for Comments) process:

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Proposal │ -> │Discussion│ -> │Consensus │ -> │  Review  │ -> │  Merged  │
│          │    │          │    │          │    │          │    │          │
│ Author   │    │ 30-60    │    │Maintainer│    │ Tests &  │    │ Release  │
│ submits  │    │ day      │    │ vote     │    │ CI pass  │    │ shipped  │
│ RFC      │    │ comment  │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

#### Step 1: Proposal

Submit an RFC document in the `spec/` directory as a pull request. The RFC must include:

- **Motivation**: Why is this change needed?
- **Design**: Technical details of the proposed change
- **Impact Analysis**: How does this affect existing scores? Include before/after examples.
- **Conformance Updates**: What test vectors need to change?
- **Migration Plan**: How do existing implementations adapt?

#### Step 2: Discussion

- **Scoring algorithm changes**: 30-day public comment period
- **Protocol extensions** (new dimensions, data sources, verification methods): 60-day comment period
- **Editorial/documentation changes**: No mandatory waiting period

All discussion happens on the pull request. Maintainers will label the RFC and assign reviewers.

#### Step 3: Consensus

After the comment period, maintainers evaluate the discussion and vote:

- **Accept**: Move to implementation
- **Revise**: Author addresses feedback, additional review cycle
- **Defer**: Good idea but not the right time -- revisit later
- **Reject**: Does not align with protocol goals

Acceptance requires consensus (no blocking objections) from active maintainers. In the event of a tie, the decision is deferred for 30 days with a call for additional community input.

#### Step 4: Implementation and Review

- Author (or assignee) implements the change
- All conformance test vectors must be updated
- CI must pass: linting, type checking, tests, conformance
- At least 2 maintainer approvals required for scoring changes

#### Step 5: Release

- Changes are coordinated across all packages
- Semantic version bump following the versioning policy below
- Release notes document all changes with migration guidance

### Expedited Process

Security vulnerabilities and critical bug fixes may bypass the standard comment period at the discretion of maintainers. All such expedited changes must still be documented via a post-hoc RFC.

---

## Validator Accreditation

### Requirements

Organizations seeking to become accredited OTR validators must meet the following criteria:

#### 1. Independence
- Demonstrate organizational independence from scored merchants
- No financial conflicts of interest with entities being scored
- Annual conflict-of-interest disclosure

#### 2. Technical Compliance
- Pass the full OTR conformance test suite
- Maintain 99.9% uptime for scoring infrastructure
- Support the current OTR protocol version within 30 days of release
- Implement all required anti-gaming detection layers

#### 3. Operational Standards
- Maintain public audit logs of all scoring operations
- Respond to scoring disputes within 5 business days
- Undergo annual independent compliance review
- Maintain adequate security controls (SOC 2 Type II or equivalent)

#### 4. Governance Participation
- Sign the OTR Validator Agreement
- Commit to the OTR Code of Conduct
- Participate in multi-validator consensus protocols
- Contribute to protocol development through the RFC process

### Accreditation Process

1. **Application**: Submit a validator application via GitHub
2. **Technical Review**: Conformance test results and infrastructure audit
3. **Governance Review**: Independence verification and conflict-of-interest check
4. **Provisional Status**: 90-day trial period with monitoring
5. **Full Accreditation**: Granted after successful trial period

### Revocation

Validator accreditation may be revoked for:
- Failing conformance tests and not remediating within 30 days
- Conflict of interest that compromises scoring independence
- Sustained downtime below the 99.9% threshold
- Violation of the Code of Conduct or Validator Agreement

---

## Conflict Resolution

### Technical Disputes

Technical disputes (e.g., scoring algorithm behavior, conformance test interpretation) are resolved through:

1. **GitHub Issue**: Open a detailed issue describing the dispute
2. **Maintainer Review**: Maintainers investigate and provide analysis
3. **Community Input**: 14-day comment period for community feedback
4. **Resolution**: Maintainers publish a decision with rationale

### Scoring Disputes

Merchants who believe their OTR score is incorrect may:

1. **Review the Algorithm**: The scoring algorithm is fully open-source -- merchants can audit exactly how their score is computed
2. **File an Issue**: Submit a GitHub Issue with specific evidence
3. **Provide Evidence**: If the score reflects incorrect data (e.g., the merchant does have a Wikidata entry but it was not detected), provide documentation
4. **Automated Resolution**: If the data is corrected, the score updates automatically on the next computation cycle

**Important**: Disputes cannot result in manual score adjustments. The resolution is always to correct the input data, after which the deterministic algorithm produces the updated score.

### Governance Disputes

Disputes about governance decisions, maintainer actions, or protocol direction are resolved through:

1. **Open Discussion**: GitHub Discussions thread describing the concern
2. **Mediation**: Neutral maintainer(s) facilitate discussion between parties
3. **Community Vote**: If mediation fails, a community-wide advisory vote (non-binding)
4. **Final Decision**: Maintainer group makes the final decision, published with full rationale

---

## Versioning Policy

OTR Protocol follows [Semantic Versioning (semver)](https://semver.org/):

- **MAJOR** (e.g., v3.0.0 -> v4.0.0): Breaking changes to scoring algorithm, evidence schema, or API contracts
- **MINOR** (e.g., v3.0.0 -> v3.1.0): New dimensions, data sources, or scoring features (backward-compatible)
- **PATCH** (e.g., v3.0.0 -> v3.0.1): Bug fixes, documentation updates, conformance test corrections

### Breaking Change Policy

Breaking changes require:

1. **RFC with impact analysis** showing before/after score distributions
2. **60-day comment period** (double the standard period)
3. **Migration guide** for all affected implementations
4. **Deprecation period**: At least 6 months of dual-version support
5. **Coordinated release** across all packages
6. **Conformance test suite** updated for both old and new versions during the deprecation period

### Version Support

| Version | Status | Support |
|---------|--------|---------|
| v3.x | **Current** | Full support, active development |
| v2.x | Deprecated | Security fixes only until 6 months after v3.0.0 release |
| v1.x | End of life | No support |

---

## Federation Model

### Phase 1: Single Validator (Current)

- ORBEXA operates as the sole validator
- Algorithm is fully open-source for independent verification
- Community can run the scoring engine locally for auditing

### Phase 2: Federated Validators

- Accredited organizations can run independent validators
- Validators must pass conformance tests
- Multi-validator consensus required for "confirmed" trust status
- Disagreements between validators are flagged for review

### Phase 3: Open Federation

- Any organization meeting accreditation criteria can join
- Governance council with elected representatives from validators, merchants, and AI agent developers
- Decentralized dispute resolution
- Certificate Transparency-style public log of all scoring operations

---

## Amendments

This governance document may be amended through the standard RFC process with a 60-day comment period. Changes to the Scoring Fairness principles (Section "Core Principles") require unanimous consent from all active maintainers.

---

## Contact

- **Protocol discussions**: [GitHub Discussions](https://github.com/yb48666-ctrl/OTR-Protocol/discussions)
- **Bug reports**: [GitHub Issues](https://github.com/yb48666-ctrl/OTR-Protocol/issues)
- **Security vulnerabilities**: security@orbexa.io (see [SECURITY.md](SECURITY.md))
- **Governance questions**: governance@orbexa.io
