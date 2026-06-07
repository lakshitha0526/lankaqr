# lankaqr — Implementation Plan

**Status:** Draft  
**Author:** Lakshitha  
**Date:** 07 Jun 2026  
**Target ship date:** Weekend of 14–15 Jun 2026

---

## 1. Problem

LankaQR is the national QR payment standard in Sri Lanka, mandated by the Central Bank of Sri Lanka (CBSL) for all licensed financial institutions and e-money operators. It is a customisation of the EMVCo Merchant-Presented Mode (MPM) QR specification, with country-specific deviations and a 28-character LankaPay merchant account block.

There is no production-grade JavaScript or TypeScript library that encodes, decodes, or validates LankaQR payloads. Existing global EMVCo libraries on npm (`emvqr`, `emv-qrcps`, `qris`) are abandoned v0.0.x stubs last touched in 2021. Sri Lankan banks, payment apps, POS vendors, e-commerce platforms, and reconciliation tools all re-implement TLV parsing and CRC computation from scratch every time. The implementations are typically scattered across internal repos, untested, and rarely handle the LankaQR-specific overrides correctly (notably the mandatory Reference Label in tag 62.05).

This is the second library in the `lk-*` family, following `lk-id`. Same shape: small, typed, zero-dependency, exhaustively tested, published with provenance.

## 2. Target users

- **Bank and fintech engineers** building consumer payment apps or merchant onboarding tools.
- **POS and e-commerce vendors** integrating LankaQR acceptance into Sri Lankan checkout flows.
- **Accounting and reconciliation tools** that need to parse merchant identifiers and reference labels from scanned QR payloads.
- **CBSL and LankaPay testers** verifying that merchant payloads from the field conform to V1.3 of the spec.
- **OSS contributors** building higher-level tools (e.g., QR image renderers, React components, mobile camera readers) who need a correct primitive to build on.

## 3. Success metrics

The library is successful if, within six months of v1.0.0 publish:

1. At least one Sri Lankan fintech or bank integrates it into a shipping product. Discoverable via dependents on npm or visible adoption in Sri Lankan developer communities.
2. Zero issues filed alleging spec non-conformance against published LankaQR payloads from real merchants.
3. Used by at least one downstream library (e.g., a React component or image renderer that builds on top).

Internal-to-Lakshitha metrics that matter regardless of external adoption:

- Demonstrates EMVCo-level technical depth in a portfolio piece.
- Anchors the `lk-*` namespace as a recognised place to find Sri Lankan developer tooling.
- Reusable inside ArkTide products that need to accept LankaQR (e.g., Homemade marketplace payments, CollectaLK loan collection).

## 4. Scope

### 4.1 In scope for v1.0

- **Encode** a LankaQR-conformant payload from structured input.
- **Decode** any well-formed EMVCo MPM payload, with LankaQR-specific field interpretation applied.
- **Validate** payload conformance (CRC check + LankaQR-specific conformance check).
- Standalone **CRC-16/CCITT-FALSE** computation and verification helpers.
- Standalone **TLV** parsing and serialisation helpers.
- **Static** (tag 01 = "11") and **Dynamic** (tag 01 = "12") QR generation.
- **Reference Label** (tag 62.05) handled as mandatory per V1.3.
- **Tip / Convenience Fee** indicator (tag 55) in all three modes: prompt, fixed (tag 56), percentage (tag 57).
- **Postal Code** (tag 61).
- **Alternate Language** template (tag 64) with Sinhala (`SI`) and Tamil (`TA`) support.
- **LankaPay merchant account block** parser and builder (the 28-character structure: Network Type + Bank Code + Sub Acquirer + Merchant ID + Terminal ID), with a clear escape hatch for raw access.
- **MCC** validation with helpers for the four CBSL-mandated category codes (5542 fuel, 9399 government, 8661 religious, 4829 P2P).
- Discriminated union return types with `ok: true | false` and structured reason strings on failure — same pattern as `lk-id`.
- Zero runtime dependencies.
- Dual ESM + CJS + DTS build via tsup.
- TypeScript 6, strict mode, `noUncheckedIndexedAccess`, `isolatedModules`, `verbatimModuleSyntax`.

### 4.2 Out of scope for v1.0

- **QR image rendering** (PNG/SVG output). That's a downstream concern — pair this library with `qrcode` on npm.
- **Camera / image decoding** to extract the QR payload string. Downstream concern — pair with `jsqr` or similar.
- **Parsing of LankaPay-reserved sub-fields** beyond the 28-character merchant account block. Tags 80–81, tag 62.60–61, and tag 26.80 sub-IDs are treated as opaque pass-through. Their internal structure is defined by Network Facilitator documents we do not have access to.
- **Consumer-Presented Mode (CPM)**. Different EMVCo spec, different byte format. May be a separate companion library later (`lankaqr-cpm` or similar) if there is demand, but unlikely — CPM never gained traction in SL.
- **Merchant onboarding API integration** with LankaPay or specific acquirers. Not our layer.
- **Currency conversion**, FX, or transaction amount normalisation beyond format validation.

### 4.3 v1.x roadmap (additive, no breaking changes)

- Helper utilities for MCC lookup (e.g., "what does MCC 5411 mean").
- Stricter validation of LankaPay merchant account block fields if Network Facilitator documents become publicly available.
- Better error messages with positional context ("invalid CRC at character 285").
- Additional language codes for alternate language template as needed.

### 4.4 v2 roadmap (may include breaking changes)

- Companion package `@lankaqr/render` for QR image generation.
- Companion package `@lankaqr/react` with a `<LankaQR>` component and `useLankaQRScanner()` hook.
- Possible move to a scoped name `@lakshitha/lankaqr` if a personal namespace becomes useful — but only after consultation with users via Discussions.

## 5. Repository structure

```
lankaqr/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── src/
│   ├── index.ts          # public exports
│   ├── encode.ts         # encode() function
│   ├── decode.ts         # decode() function
│   ├── validate.ts       # isValid() + LankaQR conformance checks
│   ├── crc.ts            # CRC-16/CCITT-FALSE compute + verify
│   ├── tlv.ts            # TLV parsing and serialisation
│   ├── merchant.ts       # LankaPay 28-char merchant account parser + builder
│   ├── tags.ts           # tag ID constants and metadata
│   └── types.ts          # shared types
├── tests/
│   ├── crc.test.ts
│   ├── tlv.test.ts
│   ├── encode.test.ts
│   ├── decode.test.ts
│   ├── roundtrip.test.ts
│   ├── merchant.test.ts
│   ├── validate.test.ts
│   └── fixtures/
│       └── vectors.ts    # test vectors (canonical + synthetic LankaQR)
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── biome.json
├── vitest.config.ts
├── README.md
├── LICENSE
├── CHANGELOG.md
├── SPEC.md
└── .gitignore
```

Same shape as `lk-id`. Same toolchain: TypeScript 6, vitest 4, @vitest/coverage-v8 4, tsup 8, @biomejs/biome 2.

## 6. Public API

The shape mirrors `lk-id`. Discriminated unions for results, named functions, named exports only.

```typescript
// Encoding
export function encode(input: LankaQRInput): EncodeResult;

// Decoding
export function decode(payload: string): DecodeResult;

// Validation
export function isValid(payload: string): boolean;

// Low-level CRC helpers
export function computeCRC(payload: string): string;  // returns 4-char uppercase hex
export function verifyCRC(payload: string): boolean;

// Low-level TLV helpers (for advanced users / debugging)
export function parseTLV(input: string): TLVNode[];
export function serializeTLV(nodes: TLVNode[]): string;

// LankaPay merchant account helpers
export function parseLankaPayMerchant(raw: string): MerchantParseResult;
export function formatLankaPayMerchant(input: LankaPayMerchant): string;
```

### 6.1 Result types

```typescript
export type EncodeResult =
  | { ok: true; payload: string }
  | { ok: false; reason: EncodeFailureReason };

export type DecodeResult =
  | { ok: true; data: LankaQRData }
  | { ok: false; reason: DecodeFailureReason };

export type MerchantParseResult =
  | { ok: true; merchant: LankaPayMerchant }
  | { ok: false; reason: MerchantParseFailureReason };
```

All reasons are lowercase English strings. Same style as `lk-id`: short, actionable. Examples: `"invalid crc"`, `"missing reference label"`, `"country code must be lk"`, `"currency must be 144 lkr"`, `"merchant account block must be 28 characters"`, `"unknown tag length"`.

### 6.2 Input type for `encode()`

```typescript
export type LankaQRInput = {
  // Required
  pointOfInitiation: "static" | "dynamic";
  merchantAccount: LankaPayMerchant | { raw: string }; // raw escape hatch for non-standard cases
  merchantAccountTag: "26" | "27";                     // which LankaPay-reserved tag to use
  merchantCategoryCode: string;                        // 4-digit MCC
  merchantName: string;                                // up to 25 chars
  merchantCity: string;                                // up to 15 chars
  referenceLabel: string;                              // mandatory in LankaQR, up to 25 chars

  // Optional
  transactionAmount?: string;                          // numeric string, up to 13 chars with decimal
  postalCode?: string;                                 // up to 10 chars
  tipIndicator?: TipIndicator;
  alternateLanguage?: AlternateLanguage;
};

export type LankaPayMerchant = {
  networkType: string;       // 1 digit
  bankCode: string;          // 4 digits
  subAcquirer: string;       // 3 digits
  merchantId: string;        // 16 chars
  terminalId: string;        // 4 chars
};

export type TipIndicator =
  | { type: "prompt" }
  | { type: "fixed"; amount: string }
  | { type: "percentage"; value: string };

export type AlternateLanguage = {
  languageCode: string;      // ISO 639-1, typically "SI" or "TA"
  merchantName: string;      // up to 25 chars in target script
  merchantCity?: string;     // up to 15 chars in target script
};
```

Country code (`LK`) and transaction currency (`144`) are not in the input type — they are constants forced by the encoder. Payload Format Indicator (tag 00 = `01`) is also forced. CRC is computed by the encoder.

### 6.3 Output type for `decode()`

```typescript
export type LankaQRData = {
  payloadFormatIndicator: "01";
  pointOfInitiation: "static" | "dynamic";
  merchantAccount: { raw: string; parsed: LankaPayMerchant | null };
  merchantAccountTag: "26" | "27";
  merchantCategoryCode: string;
  countryCode: string;
  transactionCurrency: string;
  transactionAmount: string | null;
  merchantName: string;
  merchantCity: string;
  postalCode: string | null;
  referenceLabel: string;
  tipIndicator: TipIndicator | null;
  alternateLanguage: AlternateLanguage | null;
  crc: string;
  // Inspection / debugging
  rawTags: Record<string, string>;
  // Pass-through values for LankaPay-reserved fields
  reservedFields: Record<string, string>;
};
```

The `merchantAccount.parsed` field is `null` if the raw value doesn't match the 28-character LankaPay structure. This lets the library be lenient on decode (accept anything the spec calls "S" / variable string) while still being strict and helpful for the common case.

Tags 80–81 and tag 62 sub-tags 60–61 land in `reservedFields` as opaque strings.

## 7. Technical specification

### 7.1 Wire format: BER-TLV

The payload is a flat or nested concatenation of TLV (Tag, Length, Value) triplets, encoded as ASCII text:

```
TT LL VVV...
```

- **Tag (TT)**: 2-character ASCII numeric, `"00"` to `"99"`.
- **Length (LL)**: 2-character ASCII numeric, value count from `"00"` to `"99"`. **Length is a character count, not a byte count.** Multi-byte UTF-8 characters (relevant for tag 64 alternate language fields with Sinhala or Tamil) still count as one character each. This matches the EMVCo MPM v1.1 spec and is critical for correct interpretation.
- **Value (V)**: the value, of the declared character length.

Some tags contain nested TLV (tag 26, 27, 62, 64). Their values are themselves TLV sequences.

Tags do not need to appear in any specific order, **except**: tag 63 (CRC) must be the last tag in the payload.

### 7.2 CRC-16/CCITT-FALSE

The checksum is the standard CRC-16/CCITT-FALSE variant:

- **Polynomial:** `0x1021`
- **Initial value:** `0xFFFF`
- **Input reflection:** none
- **Output reflection:** none
- **Final XOR:** `0x0000`

The CRC is computed over **the UTF-8 byte sequence** of everything up to and including the literal characters `"6304"` (the tag ID `63` and the length `04` of the CRC tag itself). The result is rendered as 4 uppercase hexadecimal characters and appended as the value of tag 63.

To verify a payload, split at the final `"6304"`, compute the CRC over `<everything>6304`, and compare against the 4-character suffix (case-insensitive on input, uppercase on output).

This was verified during research against the canonical EMVCo MPM test vector — implementation produces `A13A` as expected.

### 7.3 Required tags for any LankaQR payload

| Tag | Name                          | Format | Length | Presence | Notes |
|-----|-------------------------------|--------|--------|----------|-------|
| 00  | Payload Format Indicator      | N      | 2      | Mandatory | Always `"01"` |
| 01  | Point of Initiation Method    | N      | 2      | Mandatory | `"11"` static, `"12"` dynamic |
| 26 or 27 | Merchant Account (LankaPay) | S | variable | Mandatory | Exactly one of 26/27 must be present and reserved for LankaPay |
| 52  | Merchant Category Code        | N      | 4      | Mandatory | 4-digit MCC per ISO 18245 |
| 53  | Transaction Currency          | N      | 3      | Mandatory | Must be `"144"` (LKR) |
| 58  | Country Code                  | ANS    | 2      | Mandatory | Must be `"LK"` |
| 59  | Merchant Name                 | ANS    | up to 25 | Mandatory | |
| 60  | Merchant City                 | ANS    | up to 15 | Mandatory | |
| 62  | Additional Data Field         | nested | variable | Mandatory | Must contain sub-tag 05 (Reference Label) — LankaQR override |
| 63  | CRC                           | ANS    | 4      | Mandatory | Last tag |

### 7.4 Optional tags

| Tag | Name                          | Format | Length | Notes |
|-----|-------------------------------|--------|--------|-------|
| 54  | Transaction Amount            | ANS    | up to 13 | Decimal allowed. Typically present only for dynamic QRs |
| 55  | Tip or Convenience Indicator  | N      | 2      | `"01"` prompt, `"02"` fixed (requires tag 56), `"03"` percentage (requires tag 57) |
| 56  | Convenience Fee Fixed         | ANS    | up to 13 | Required if tag 55 = `"02"` |
| 57  | Convenience Fee Percentage    | ANS    | up to 5 | Required if tag 55 = `"03"` |
| 61  | Postal Code                   | ANS    | up to 10 | |
| 64  | Merchant Information (Language Template) | nested | variable | UTF-8 in value, character-count length |

### 7.5 Nested tag 62 sub-tags

| Sub-tag | Name             | Format | Length | Presence in LankaQR |
|---------|------------------|--------|--------|---------------------|
| 05      | Reference Label  | ANS    | up to 25 | **Mandatory** (LankaQR override; optional in base EMVCo) |
| 60      | Reserved for LankaPay | S | variable | Optional, opaque |
| 61      | Reserved for LankaPay | S | variable | Optional, opaque |

### 7.6 Nested tag 64 sub-tags

| Sub-tag | Name                     | Format | Length |
|---------|--------------------------|--------|--------|
| 00      | Language Preference      | ANS    | 2 (ISO 639-1) |
| 01      | Alternate Merchant Name  | UTF-8  | up to 25 chars |
| 02      | Alternate Merchant City  | UTF-8  | up to 15 chars |

### 7.7 LankaPay merchant account block (tag 26 or 27 value)

Per the most authoritative public description (2021 industry documentation; CBSL V1.3 itself defers to Network Facilitator documents that are not public):

```
Position  Field          Length
1         Network Type   1
2-5       Bank Code      4
6-8       Sub Acquirer   3
9-24      Merchant ID    16
25-28     Terminal ID    4
Total                   28 characters
```

All fields are alphanumeric. The block is the entire value of tag 26 or 27 — there is no nested TLV inside the LankaPay block (this is a LankaQR deviation from base EMVCo MPM, which uses nested sub-IDs starting at `00` for a Global Unique Identifier).

**Risk:** This structure may have evolved since 2021. The v1.0 implementation will:

1. **Encode**: build the 28-character string from typed input.
2. **Decode**: if the raw value is exactly 28 characters, attempt to parse it into the structured form. If not, expose only the `raw` field and set `parsed: null`.
3. **Validate**: warn (not fail) if the merchant block isn't 28 chars, since a future revision of the LankaPay format would otherwise break valid payloads.

This gives the library forward compatibility — if LankaPay introduces a 30-char or nested format in V1.4, existing code keeps working; only the structured parser stops returning a populated `parsed` field.

### 7.8 CBSL-mandated MCC values for specific merchant categories

Per V1.3 section 1.3:

| MCC | Use case |
|-----|----------|
| 5542 | Automated fuel dispensers |
| 9399 | Government services |
| 8661 | Religious organisations |
| 4829 | Person-to-Person (P2P) fund transfers |

These are not enforced as the only valid MCCs (any 4-digit MCC is accepted). They are exposed as named exports for convenience:

```typescript
export const MCC = {
  FUEL: "5542",
  GOVERNMENT: "9399",
  RELIGIOUS: "8661",
  P2P: "4829",
} as const;
```

### 7.9 Character set

EMVCo MPM v1.1 specifies that values use the Invariant Character Set (a printable ASCII subset) **except** for tag 64 (Merchant Information — Language Template) sub-tag 01 and 02, which use UTF-8 for the target language script. Length on UTF-8 fields is character count, not byte count.

The encoder will not validate that input strings are restricted to the invariant character set — that's the user's responsibility — but the decoder will preserve the original characters faithfully. The CRC always runs on the UTF-8 byte representation, so multi-byte characters are handled correctly without special casing.

## 8. Conformance levels for `isValid()` and `decode()`

Two levels of strictness:

1. **EMVCo well-formed:** TLV parses, all lengths are consistent, CRC matches, tag 63 is last. This is what `decode()` requires to return `ok: true`. A payload that is well-formed but not LankaQR-conformant (e.g., currency `840` for USD) will still decode, and the resulting data will faithfully reflect what was in the payload.

2. **LankaQR-conformant:** EMVCo well-formed, **plus** country code is `LK`, currency is `144`, exactly one of tag 26 or 27 is present, tag 62 sub-tag 05 (Reference Label) is present. This is what `isValid()` requires to return `true`.

This split is deliberate. It lets the library serve two distinct users: someone reconciling foreign QR payloads sees full decoded data; someone enforcing CBSL compliance gets a clean boolean.

## 9. Test strategy

Same approach as `lk-id`: vitest, 100% coverage target, named test cases describing intent.

### 9.1 Test categories

| Category | What it covers | Approx test count |
|----------|----------------|-------------------|
| CRC | CCITT-FALSE algorithm against known vectors; UTF-8 byte handling; case-insensitive verify; uppercase emit | 8 |
| TLV | Parse and serialise of flat TLV; nested TLV (tag 26, 62, 64); length consistency; UTF-8 character counting; round-trip | 12 |
| Encode | Static QR; dynamic QR; all required fields; with and without optional fields; tip indicator in all three modes; alternate language with Sinhala and Tamil | 18 |
| Decode | Canonical EMVCo vector (non-LankaQR); synthetic LankaQR static and dynamic; with optional fields; with tip; with alternate language; foreign currency payload (still decodes) | 15 |
| Roundtrip | Encode then decode produces structurally equal input | 6 |
| Validate | Bad CRC; missing reference label; wrong country; wrong currency; missing merchant account; both 26 and 27 present (must reject) | 10 |
| Merchant | Parse 28-char block; format from typed input; handle non-28-char input gracefully; roundtrip | 8 |
| Edge cases | Maximum length payload; minimum payload; empty optional fields; mixed-case CRC input | 6 |

**Target:** approximately 80+ tests across 8 test files. 100% line, branch, function, and statement coverage on `src/`.

### 9.2 Test vectors

`tests/fixtures/vectors.ts` will contain:

- The canonical EMVCo MPM test vector (for decode-only verification).
- A minimal valid LankaQR static QR — synthetic, hand-built, CRC computed.
- A LankaQR dynamic QR with amount.
- A LankaQR with tip indicator in fixed mode.
- A LankaQR with tip indicator in percentage mode.
- A LankaQR with Sinhala alternate language.
- A LankaQR with Tamil alternate language.
- A LankaQR with all optional fields populated.
- Several malformed payloads (one per failure reason).

Each vector will have a comment explaining its provenance and what it exercises.

### 9.3 Property-based testing — out of scope for v1.0

A property-based fuzzer (e.g., `fast-check`) generating arbitrary inputs to round-trip would be valuable but adds a dependency and complicates CI. Deferred to v1.x.

## 10. Build and tooling

Identical to `lk-id`:

- `typescript@6.x` with `noUncheckedIndexedAccess: true`, `isolatedModules: true`, `verbatimModuleSyntax: true`, `ignoreDeprecations: "6.0"`.
- `tsup@8.x` for ESM + CJS + DTS build, sourcemaps off in published artefact.
- `vitest@4.x` with `@vitest/coverage-v8@4.x`.
- `@biomejs/biome@2.x` for lint + format.
- GitHub Actions CI: lint, typecheck, test with coverage, build.
- Release workflow on `v*` tags using `npm publish --provenance --access public` via OIDC.

Target bundle size: under 8 KB ESM (the CRC table and tag metadata add some volume compared to lk-id).

## 11. Documentation

`README.md` will contain, in order:

1. One-sentence pitch.
2. Install (`npm i lankaqr`).
3. Status badge (npm, CI, coverage).
4. **Encode example:** static QR, minimal input → payload string.
5. **Encode example:** dynamic QR with amount, tip, alternate language.
6. **Decode example:** known LankaQR payload → structured output.
7. **Validate example:** boolean check.
8. **LankaPay merchant block** example.
9. API reference table linking to JSDoc.
10. Conformance notes (the two levels, what is and isn't enforced).
11. Limitations (no QR image rendering, opaque LankaPay reserved fields).
12. Reference to CBSL V1.3 and EMVCo MPM v1.1.
13. Licence (MIT).

`SPEC.md` (this document) ships in the repo as the design rationale and reference.

`CHANGELOG.md` follows Keep A Changelog.

## 12. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LankaPay 28-char merchant block format has changed since 2021 documentation | Medium | Medium — would produce wrong `parsed` field on decode | Lenient decode (preserve raw, attempt structured parse). v1.x can tighten if newer docs surface. |
| CBSL releases V1.4 with new mandatory fields | Low | Medium | Library is permissive on unknown tags (pass-through). New mandatory fields would need a v1.x update. |
| Sinhala or Tamil rendering encoding edge cases (e.g., zero-width joiners affecting character count) | Low | Low | CRC operates on bytes, so encoding edge cases don't break verification. Length-as-character-count is the EMVCo rule; we follow it. |
| `lankaqr` name is squatted between research and publish | Very Low | High | Publish a v0.0.1 placeholder during repo setup (same pattern that worked for `lk-id`). |
| Existing internal LankaQR libraries at banks differ from spec in production payloads | Medium | Low | Decode is permissive (EMVCo well-formedness). Validate is strict (CBSL conformance). Users can pick their level. |

## 13. Delivery plan

Approximate sequencing — same pattern as `lk-id`, with explicit review checkpoints between steps.

### Phase 1: Repo setup (15 min)
- Step A: Create `lankaqr/` directory, `package.json` skeleton, `.gitignore`, `LICENSE` (MIT), `README.md` placeholder, `SPEC.md` (this document, lightly trimmed).
- Step B: Initialise git, GitHub repo, npm name reservation publish (v0.0.1 placeholder).

### Phase 2: Core build with Claude Code (per Claude Code prompts to be written)
- Step C: TS / tsup / vitest / biome config.
- Step D: `src/crc.ts` + tests. Verify against canonical EMVCo vector.
- Step E: `src/tlv.ts` + tests. Flat and nested.
- Step F: `src/tags.ts` + `src/types.ts`. Constants and shared types.
- Step G: `src/merchant.ts` + tests. LankaPay block parser + builder.
- Step H: `src/encode.ts` + tests.
- Step I: `src/decode.ts` + tests.
- Step J: `src/validate.ts` + tests.
- Step K: `tests/roundtrip.test.ts`. End-to-end encode → decode equivalence.
- Step L: `src/index.ts` public exports. README finalisation.
- Step M: CI workflow + release workflow.

### Phase 3: Publish (15 min)
- Step N: Final lint + typecheck + test + build green locally.
- Step O: Tag `v1.0.0`, push tag, verify provenance publish.
- Step P: GitHub Release (with a proper version sequence this time — no broken phantom publishes).

Each step is reviewed before the next begins.

## 14. Locked decisions

The six design questions raised during scoping have been resolved as follows:

1. **CRC case sensitivity.** `decode()` and `verifyCRC()` accept either case on input. `encode()` and `computeCRC()` always emit uppercase. Liberal in input, strict in output. Real-world payloads occasionally use lowercase hex due to lazy implementations; rejecting them would block valid use cases.

2. **Country code and currency.** `LK` (tag 58) and `144` (tag 53) are constants forced by the encoder, not user-configurable. LankaQR is definitionally Sri Lanka and LKR; an override would be a foot-gun. If a user needs USD or a non-SL country code, they don't need LankaQR.

3. **Tag 26 vs 27.** `encode()` requires the user to specify exactly one via `merchantAccountTag: "26" | "27"`. `decode()` is lenient: if both tags are present, tag 26 wins and the value of tag 27 goes into `reservedFields["27"]` as opaque pass-through. `isValid()` requires at least one of 26 or 27 to be present and does not fail when both are. The CBSL spec reserves both IDs for LankaPay without forbidding co-occurrence, and being permissive here protects against unusual but technically valid payloads.

4. **MCC enforcement.** Any 4-digit numeric string is accepted in v1.0. The four CBSL-mandated values are exposed as named constants (`MCC.FUEL` = `"5542"`, `MCC.GOVERNMENT` = `"9399"`, `MCC.RELIGIOUS` = `"8661"`, `MCC.P2P` = `"4829"`) for convenience but not enforced as the only valid set. Full MCC catalogue lookup helpers are deferred to v1.x.

5. **`isValid()` granularity.** Returns boolean only. Structured failure reasons live on `decode()`. Clean intent separation: use `isValid()` for gates and conformance checks, use `decode()` for diagnostics and error reporting.

6. **Field naming.** `pointOfInitiation` (matching the EMVCo and CBSL spec name exactly). The value type `"static" | "dynamic"` carries the readability; the field name preserves spec fidelity for engineers cross-referencing CBSL V1.3 or EMVCo MPM v1.1. Spec match wins over surface-level brevity in a library whose identity is "the LankaQR spec implementation".

## 15. Definition of done

Borrowed verbatim shape from `lk-id`, adapted for QR semantics. Library v1.0.0 ships when:

- [ ] All 8 test categories implemented with ≥ 80 tests passing.
- [ ] 100 percent coverage on statements, branches, functions, and lines (`src/`).
- [ ] Bundle size under 8 KB ESM.
- [ ] Zero runtime dependencies.
- [ ] Build produces ESM, CJS, and DTS artefacts via tsup.
- [ ] Biome lint clean. Typecheck clean. No suppression comments outside `tags.ts` (which holds inline tag-table constants).
- [ ] GitHub Actions CI passes on Node 20 on push and pull request.
- [ ] `CHANGELOG.md` committed with v1.0.0 entry.
- [ ] `README.md` has install, encode example, decode example, validate example, merchant block example, conformance notes, and CBSL reference link.
- [ ] `SPEC.md` (this document) committed to the repo as the design record.
- [ ] Published to npm `lankaqr@1.0.0` with provenance attestation via GitHub Actions OIDC.
- [ ] GitHub Release v1.0.0 marked as Latest, no broken phantom versions.

---

## Appendix A: References

- CBSL LANKAQR Specification V1.3, January 2026, Circular PSD 02/2026. https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/laws/cdg/psd_circular_no_02_of_2026_e.pdf
- EMV® QR Code Specification for Payment Systems (EMV QRCPS) — Merchant-Presented Mode — Version 1.1, November 2020. EMVCo. https://www.emvco.com/specifications/
- LankaQR Wikipedia article (background and adoption context). https://en.wikipedia.org/wiki/LankaQR
- Industry analysis of LankaPay merchant account block structure (2021). Sumudu Sahan Weerasuriya. https://sumudusahanweerasuriya.medium.com/digital-payment-industry-with-lankaqr-77de7a4e1817
- mvallim/emv-qrcode (Java, MIT licence) — reference implementation studied. https://github.com/mvallim/emv-qrcode
- mercari/go-emv-code (Go) — additional reference. https://github.com/mercari/go-emv-code

## Appendix B: Canonical CRC test vector

This was used during research to verify the CRC implementation:

```
Payload: 00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING64200002ZH0104最佳运输0202北京540523.7253031565502016233030412340603***0708A60086670902ME91320016A0112233449988770708123456786304A13A

Expected CRC: A13A (over UTF-8 bytes of everything up to and including "6304")
```

This is **not** a LankaQR-conformant payload (country code is `CN`, currency is `156` for CNY), but it exercises the full EMVCo MPM structure including nested templates and UTF-8 in tag 64. It is the canonical example shipped with most EMVCo-conformant libraries and serves as a baseline correctness check.
