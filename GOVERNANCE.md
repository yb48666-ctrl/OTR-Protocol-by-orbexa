# OTR Protocol Governance

## Overview

The Open Trust Registry (OTR) protocol is governed by an open, transparent model
designed to maintain scoring independence and prevent any single entity from
controlling merchant trust assessments.

## Governance Principles

### 1. Algorithmic Independence

OTR scores are computed using **deterministic, open-source algorithms**. No
entity — including ORBEXA — can manually override, adjust, or influence
individual trust scores.

### 2. Scoring Fairness

- Scores cannot be purchased or influenced through commercial relationships
- Whether a merchant is an ORBEXA SaaS subscriber has NO impact on their OTR score
- All scoring changes require public RFC proposal and community review

### 3. Open Development

- All protocol changes are proposed via public RFCs
- Scoring algorithm changes require conformance test updates
- Breaking changes follow semantic versioning with deprecation periods

## Decision Making

### Scoring Algorithm Changes

1. **Proposal**: Submit RFC in `spec/` directory
2. **Review**: 30-day public comment period
3. **Testing**: Updated conformance tests required
4. **Approval**: Requires consensus from maintainers
5. **Implementation**: Coordinated release across all packages

### Protocol Extensions

New dimensions, data sources, or verification methods follow the same
RFC process but with a 60-day comment period.

## Federation Model (Roadmap)

### Phase 1: Single Validator (Current)
- ORBEXA operates as the sole validator
- Algorithm is open-source for independent verification

### Phase 2: Federated Validators
- Accredited organizations can run independent validators
- Validators must pass conformance tests
- Multi-validator consensus required for "confirmed" status

### Phase 3: Open Federation
- Any organization meeting accreditation criteria can join
- Governance council with elected representatives
- Decentralized dispute resolution

## Validator Accreditation (Future)

Organizations seeking to become OTR validators must:

1. Demonstrate independence from scored merchants
2. Pass OTR conformance test suite
3. Commit to the OTR Code of Conduct
4. Maintain public audit logs
5. Undergo annual compliance review

## Contact

- Protocol discussions: GitHub Discussions
- Security issues: security@orbexa.io
- Governance questions: governance@orbexa.io
