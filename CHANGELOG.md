# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `MerchantParseFailureReason` type — now the `reason` type on a failed `parseLankaPayMerchant` result (previously a plain `string`), for parity with `EncodeFailureReason` and `DecodeFailureReason`.

### Changed

- CI and release workflows pin `actions/setup-node@v5` and `actions/upload-artifact@v7`, clearing the GitHub Actions Node 20 runtime deprecation notice.

## [1.0.0] - 2026-06-22

First stable release.

### Added

- `encode(input)` — build a CBSL V1.3 / EMVCo MPM payload from structured input, with forced `LK` country, `144` (LKR) currency, and a computed CRC.
- `decode(payload)` — parse any EMVCo well-formed payload into structured data (permissive; foreign payloads decode without enforcing LankaQR rules).
- `isValid(payload)` — boolean LankaQR conformance check (country `LK`, currency `144`, a merchant account tag, and a reference label).
- `computeCRC` / `verifyCRC` — CRC-16/CCITT-FALSE helpers.
- `parseTLV` / `serializeTLV` — low-level EMVCo TLV helpers.
- `parseLankaPayMerchant` / `formatLankaPayMerchant` — 28-character LankaPay merchant account block parser and builder.
- `MCC` constants for the four CBSL-mandated category codes (fuel, government, religious, P2P).
- Dual ESM + CJS + type-declaration build, zero runtime dependencies.

[Unreleased]: https://github.com/lakshitha0526/lankaqr/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/lakshitha0526/lankaqr/releases/tag/v1.0.0
