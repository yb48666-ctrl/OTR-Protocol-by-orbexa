# Contributing to OTR Protocol

Thank you for your interest in contributing to the Open Trust Registry Protocol! OTR is an open-source project that depends on community involvement to build a fair, transparent, and robust merchant trust layer for AI agent commerce.

This guide covers everything you need to know to contribute effectively.

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style Guide](#code-style-guide)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Scoring Algorithm Changes](#scoring-algorithm-changes)
- [Issue Guidelines](#issue-guidelines)
- [Issue Labels](#issue-labels)
- [Community](#community)

---

## Ways to Contribute

There are many ways to contribute to OTR Protocol, regardless of your experience level:

- **Report bugs** -- Found something that does not work as expected? Open an issue.
- **Suggest features** -- Have an idea for a new dimension, data source, or tool? Start a discussion.
- **Fix bugs** -- Browse [open issues](https://github.com/yb48666-ctrl/OTR-Protocol/issues?q=is%3Aissue+is%3Aopen+label%3Abug) and submit a fix.
- **Improve documentation** -- Better docs help everyone. Fix typos, add examples, improve clarity.
- **Write conformance tests** -- Help ensure scoring determinism across implementations.
- **Implement in a new language** -- Port the scoring engine to Python, Go, Rust, or other languages.
- **Review pull requests** -- Thoughtful code review is one of the most valuable contributions.
- **Participate in RFCs** -- Weigh in on proposed protocol changes in the `spec/` directory.

---

## Getting Started

1. **Read the docs** -- Familiarize yourself with the [Protocol Specification](spec/OTR-SPEC-v3.md) and [Scoring Algorithm](spec/SCORING-ALGORITHM-v3.md).
2. **Understand the principles** -- Review the [Governance Model](GOVERNANCE.md), especially the Scoring Fairness commitments.
3. **Check existing issues** -- Look for issues labeled [`good first issue`](https://github.com/yb48666-ctrl/OTR-Protocol/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) or [`help wanted`](https://github.com/yb48666-ctrl/OTR-Protocol/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).
4. **Set up your environment** -- Follow the development setup instructions below.

---

## Development Setup

### Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **TypeScript** >= 5.7
- **Git**

### Installation

```bash
# Fork and clone the repository
git clone https://github.com/<your-username>/otr-protocol.git
cd otr-protocol

# Install dependencies (monorepo with workspaces)
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run conformance tests
npm run conformance

# Lint the codebase
npm run lint
```

### Working on a Package

Each package can be developed independently:

```bash
# Work on the core scoring engine
cd packages/core
npm run build
npm test

# Work on the MCP server
cd packages/mcp-server
npm run build
npm test

# Work on the CLI validator
cd packages/validator-cli
npm run build
npm test

# Work on the SDK
cd packages/sdk
npm run build
npm test
```

---

## Project Structure

```
otr-protocol/
├── packages/
│   ├── core/               # Deterministic scoring engine (reference implementation)
│   │   └── src/
│   │       ├── types.ts     # All TypeScript type definitions
│   │       ├── constants.ts # Weights, thresholds, configuration
│   │       ├── scorer.ts    # Scoring logic for all 7 dimensions
│   │       ├── anti-fraud.ts# Anti-gaming detection
│   │       ├── validator.ts # Trust manifest validation
│   │       └── index.ts     # Public API exports
│   ├── mcp-server/          # MCP Server for AI agent integration
│   ├── validator-cli/       # Command-line verification tool
│   └── sdk/                 # TypeScript client SDK
├── conformance/
│   ├── test-vectors.json    # Standard conformance test vectors
│   └── runner.ts            # Conformance test runner
├── spec/
│   ├── OTR-SPEC-v3.md      # Protocol specification
│   └── SCORING-ALGORITHM-v3.md  # Detailed scoring algorithm docs
├── examples/                # Usage examples
├── package.json             # Root monorepo config
└── tsconfig.json            # Root TypeScript config
```

---

## Code Style Guide

### TypeScript

- **Strict mode** enabled (`strict: true` in tsconfig.json)
- **No `any` types** -- use proper typing or `unknown` with type guards
- **Pure functions preferred** -- scoring functions must be deterministic (no side effects, no I/O)
- **Immutable data** -- use `as const`, `readonly`, and spread operators instead of mutation

### Formatting

- **ESLint** + **Prettier** for consistent formatting
- Run `npm run lint` before submitting a PR
- Max line length: 100 characters
- 2-space indentation
- Semicolons required
- Double quotes for strings

### Documentation

- All **public APIs** must have JSDoc comments with `@param`, `@returns`, and `@example` tags
- All **scoring functions** must document their deterministic behavior
- All **constants** must include comments explaining the rationale for their values
- Protocol specs use RFC-style formatting
- API documentation follows OpenAPI 3.0

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | `kebab-case.ts` | `anti-fraud.ts` |
| Interfaces/Types | `PascalCase` | `ScoringEvidence` |
| Functions | `camelCase` | `calculateTrustScore` |
| Constants | `SCREAMING_SNAKE_CASE` | `BADGE_THRESHOLDS` |
| Enum-like arrays | `SCREAMING_SNAKE_CASE` | `BADGE_LEVELS` |

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`, `ci`

Scopes: `core`, `mcp-server`, `validator`, `sdk`, `conformance`, `spec`

Examples:
```
feat(core): add DMARC policy weight to technical dimension
fix(mcp-server): handle timeout on large merchant verification
docs(spec): clarify anti-gaming multiplier calculation
test(conformance): add test vector for PLATINUM badge threshold
```

---

## Testing Requirements

### Unit Tests

- All new features must include unit tests
- All bug fixes must include a regression test
- Tests use [Vitest](https://vitest.dev/)
- Target: 90%+ code coverage for the `core` package

```bash
# Run all tests
npm test

# Run tests for a specific package
cd packages/core && npm test

# Run tests in watch mode
npx vitest --watch
```

### Conformance Tests

Conformance tests are the backbone of OTR Protocol. They ensure that **identical inputs produce identical outputs** across all implementations.

**Requirements:**
- Any change to the scoring algorithm **must** update the conformance test vectors in `conformance/test-vectors.json`
- All test vectors must pass before a PR can be merged
- New test vectors should cover edge cases and boundary conditions

```bash
# Run conformance tests
npm run conformance
```

**Adding a new test vector:**

1. Add the test case to `conformance/test-vectors.json`:
```json
{
  "id": "TV-XXX",
  "description": "Description of what this test validates",
  "evidence": { /* ScoringEvidence fields */ },
  "expectedPhase": "PUBLIC_ASSESSMENT",
  "expectedDimensions": { /* TrustDimensions */ },
  "expectedFastTrackBonus": 0,
  "expectedTrustScore": 75,
  "expectedBadge": "SILVER",
  "expectedTier": "TIER_3"
}
```

2. Run `npm run conformance` to verify the vector passes.

### Determinism Verification

The scoring engine must be **purely deterministic**: given the same `ScoringEvidence` input, every compliant implementation must produce the exact same `ScoreResult`. This means:

- No random number generation
- No time-dependent logic (except score decay, which takes a fixed timestamp input)
- No floating-point ambiguity (scores are rounded to integers)
- No external API calls during scoring
- No dependency on execution order

---

## Pull Request Process

### Before You Start

1. **Check for existing work** -- Search open issues and PRs to avoid duplication
2. **Open an issue first** for significant changes -- discuss the approach before investing time in implementation
3. **Keep PRs focused** -- One logical change per PR. If you find unrelated issues, file them separately.

### Creating a Pull Request

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** following the code style guide above.

3. **Write tests** for any new functionality.

4. **Run the full test suite** to make sure nothing is broken:
   ```bash
   npm run build
   npm test
   npm run conformance
   npm run lint
   ```

5. **Submit a pull request** against `main` with a clear description:
   - What does this change do?
   - Why is it needed?
   - How was it tested?
   - Does it affect existing scores? If so, include before/after examples.

### Review Process

1. **Automated checks** -- CI must pass (lint, build, test, conformance)
2. **Code review** -- At least 1 maintainer approval required (2 for scoring changes)
3. **Discussion** -- Reviewers may request changes; iterate as needed
4. **Merge** -- Maintainer merges via squash-and-merge

### Review Criteria

Reviewers evaluate PRs on:

- **Correctness** -- Does it do what it claims?
- **Determinism** -- Does it maintain scoring determinism?
- **Test coverage** -- Are edge cases covered?
- **Code quality** -- Is it clean, well-documented, and maintainable?
- **Conformance** -- Do all test vectors still pass?
- **Backward compatibility** -- Does it break existing consumers?

---

## Scoring Algorithm Changes

Changes to the scoring algorithm have a higher bar because they directly affect merchant trust assessments. All scoring changes must follow the RFC process:

### 1. Write an RFC

Create a document in `spec/` describing:
- **Problem**: What issue does the current algorithm have?
- **Proposal**: What specific changes are being made?
- **Impact Analysis**: Run the proposed changes against known merchant data and show before/after score distributions
- **Anti-Gaming Implications**: Does this create new gaming vectors?
- **Conformance Updates**: List all test vectors that need to change

### 2. Community Review

- Submit the RFC as a pull request
- 30-day minimum comment period
- Maintainers will label and assign reviewers
- Respond to all substantive feedback

### 3. Implementation

- Update the scoring engine in `packages/core`
- Update all conformance test vectors
- Update documentation and spec
- Ensure all CI checks pass

### 4. Approval

- Requires approval from at least 2 maintainers
- No unresolved blocking objections
- Conformance tests pass for all implementations

---

## Issue Guidelines

### Bug Reports

Use the **Bug Report** template and include:

- **OTR version** and package name
- **Steps to reproduce** the issue
- **Expected behavior** vs. **actual behavior**
- **Environment** details (Node.js version, OS)
- **Error messages** or logs (if applicable)

### Feature Requests

Use the **Feature Request** template and include:

- **Problem statement** -- What user need is not being met?
- **Proposed solution** -- How should it work?
- **Alternatives considered** -- What other approaches were evaluated?
- **Impact on scoring** -- Does this affect trust scores?

### Security Vulnerabilities

**Do NOT open a public issue for security vulnerabilities.**

Report security issues privately to **security@orbexa.io**. See [SECURITY.md](SECURITY.md) for our security policy and responsible disclosure process.

---

## Issue Labels

| Label | Description |
|-------|-------------|
| `bug` | Something is not working correctly |
| `feature` | New feature or capability request |
| `enhancement` | Improvement to existing functionality |
| `documentation` | Documentation improvements needed |
| `good first issue` | Good for newcomers to the project |
| `help wanted` | Community contributions welcome |
| `scoring` | Affects the trust scoring algorithm |
| `anti-gaming` | Related to anti-fraud/anti-gaming detection |
| `conformance` | Conformance test suite changes |
| `rfc` | Protocol change requiring RFC process |
| `breaking` | Introduces a breaking change |
| `mcp-server` | Related to the MCP Server package |
| `cli` | Related to the CLI validator package |
| `sdk` | Related to the TypeScript SDK package |
| `security` | Security-related issue (non-vulnerability) |
| `wontfix` | Will not be addressed |
| `duplicate` | Duplicate of an existing issue |

---

## Community

- **GitHub Discussions** -- General questions, ideas, and community conversations
- **GitHub Issues** -- Bug reports and feature requests
- **RFCs in `spec/`** -- Formal protocol change proposals

---

## License

By contributing to OTR Protocol, you agree that your contributions will be licensed under the [MIT License](LICENSE).

Thank you for helping build the trust layer for AI agent commerce.
