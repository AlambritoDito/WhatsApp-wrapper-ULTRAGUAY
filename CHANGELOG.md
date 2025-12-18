# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-12-18

### Fixed
- Updated `scripts/` to use the published NPM package for reliable example usage.
- Fixed type errors in examples (`quickStart.ts`, etc.) to align with `InboundMessage` types.
- Verified bot functionality on custom ports.
## [1.1.0] - 2025-12-03

### Added
- GitHub Actions for CI (linting, testing, building).
- Community files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.
- Improved flexibility in `startWebhookServer` and `verifySignature` to accept config objects.

## [1.0.2] - 2024-05-20
### Fixed
- Minor bug fixes and type improvements.

## [1.0.0] - Initial Release
- Basic functionality for sending messages and handling webhooks.
