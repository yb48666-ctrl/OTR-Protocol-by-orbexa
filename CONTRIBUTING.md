# Contributing to OTR Protocol

Thank you for your interest in contributing to the Open Trust Registry protocol!

## How to Contribute

### Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include steps to reproduce for bugs
- For security vulnerabilities, email security@orbexa.io instead

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests: `npm test`
5. Run conformance tests: `npm run conformance`
6. Submit a PR with a clear description

### Code Style

- TypeScript with strict mode
- ESLint + Prettier for formatting
- All public APIs must have JSDoc comments
- Test coverage required for new features

### Scoring Algorithm Changes

Changes to the scoring algorithm require:

1. RFC-style proposal in `spec/` directory
2. Updated test vectors in `conformance/test-vectors.json`
3. Determinism verification: same inputs must produce identical outputs
4. Review by at least 2 maintainers

### Documentation

- Protocol specs use RFC-style formatting
- API documentation follows OpenAPI 3.0
- All examples must be runnable

## Development Setup

```bash
git clone https://github.com/anthropics/otr-protocol.git
cd otr-protocol
npm install
npm run build
npm test
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
