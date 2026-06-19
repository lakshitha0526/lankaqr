# lankaqr

Encode, decode, and validate LankaQR payments in TypeScript and JavaScript — the CBSL V1.3 / EMVCo Merchant-Presented Mode standard, with zero runtime dependencies.

## Install

```sh
npm i lankaqr
```

## Status

[![npm version](https://img.shields.io/npm/v/lankaqr.svg)](https://www.npmjs.com/package/lankaqr)
[![CI](https://github.com/lakshitha0526/lankaqr/actions/workflows/ci.yml/badge.svg)](https://github.com/lakshitha0526/lankaqr/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/lakshitha0526/lankaqr)

## Encode a static QR

A static QR carries no amount — the payer keys it in. Minimal required input:

```ts
import { encode } from "lankaqr";

const result = encode({
  pointOfInitiation: "static",
  merchantAccount: {
    networkType: "1",
    bankCode: "7056",
    subAcquirer: "001",
    merchantId: "MERCHANT00000001",
    terminalId: "T001",
  },
  merchantAccountTag: "26",
  merchantCategoryCode: "5999",
  merchantName: "ACME STORE",
  merchantCity: "COLOMBO",
  referenceLabel: "INV-001",
});

if (result.ok) {
  console.log(result.payload);
  // 000201010211262817056001MERCHANT00000001T0015204599953031445802LK5910ACME STORE6007COLOMBO62110507INV-0016304D4F0
}
```

Country code (`LK`), currency (`144`, LKR), and the payload format indicator (`01`) are forced by the encoder — they are not part of the input. The CRC is computed for you.

## Encode a dynamic QR with amount, tip, and alternate language

A dynamic QR fixes the amount. This example also adds a percentage tip and a Sinhala alternate-language template. The merchant account is supplied through the raw escape hatch:

```ts
import { encode } from "lankaqr";

const result = encode({
  pointOfInitiation: "dynamic",
  merchantAccount: { raw: "17056001MERCHANT00000001T001" },
  merchantAccountTag: "26",
  merchantCategoryCode: "5999",
  merchantName: "ACME STORE",
  merchantCity: "COLOMBO",
  referenceLabel: "INV-042",
  transactionAmount: "2500.00",
  tipIndicator: { type: "percentage", value: "10" },
  alternateLanguage: {
    languageCode: "SI",
    merchantName: "ඒස් සාප්පුව",
    merchantCity: "කොළඹ",
  },
});

if (result.ok) {
  console.log(result.payload);
}
```

`tipIndicator` has three modes: `{ type: "prompt" }`, `{ type: "fixed", amount }` (tag 56), and `{ type: "percentage", value }` (tag 57).

## Decode a payload

`decode` accepts any EMVCo well-formed payload and returns structured data:

```ts
import { decode } from "lankaqr";

const result = decode(
  "000201010211262817056001MERCHANT00000001T0015204599953031445802LK5910ACME STORE6007COLOMBO62110507INV-0016304D4F0",
);

if (result.ok) {
  const { data } = result;
  console.log(data.merchantName); // "ACME STORE"
  console.log(data.referenceLabel); // "INV-001"
  console.log(data.merchantAccount.parsed?.bankCode); // "7056"
} else {
  console.error(result.reason); // e.g. "invalid crc"
}
```

The 28-character LankaPay block is parsed into `merchantAccount.parsed` when it fits the structure, or left as `null` (with the original string in `merchantAccount.raw`) when it does not — `decode` stays lenient so it can read non-standard payloads.

## Validate conformance

`isValid` is a boolean gate for CBSL conformance. For diagnostics, call `decode` and read `reason`:

```ts
import { isValid } from "lankaqr";

isValid(
  "000201010211262817056001MERCHANT00000001T0015204599953031445802LK5910ACME STORE6007COLOMBO62110507INV-0016304D4F0",
); // true
```

## LankaPay merchant block

Parse or build the 28-character LankaPay account block on its own:

```ts
import { formatLankaPayMerchant, parseLankaPayMerchant } from "lankaqr";

const parsed = parseLankaPayMerchant("17056001MERCHANT00000001T001");
if (parsed.ok) {
  console.log(parsed.merchant.bankCode); // "7056"
}

const raw = formatLankaPayMerchant({
  networkType: "1",
  bankCode: "7056",
  subAcquirer: "001",
  merchantId: "MERCHANT00000001",
  terminalId: "T001",
});
// raw === "17056001MERCHANT00000001T001"
```

The block layout (SPEC §7.7) is: network type (1) + bank code (4) + sub acquirer (3) + merchant ID (16) + terminal ID (4).

## API reference

| Function | Input | Output |
|----------|-------|--------|
| `encode` | `LankaQRInput` | `EncodeResult` |
| `decode` | `string` | `DecodeResult` |
| `isValid` | `string` | `boolean` |
| `computeCRC` | `string` | `string` (4-char uppercase hex) |
| `verifyCRC` | `string` | `boolean` |
| `parseTLV` | `string` | `TLVNode[]` |
| `serializeTLV` | `readonly TLVNode[]` | `string` |
| `parseLankaPayMerchant` | `string` | `MerchantParseResult` |
| `formatLankaPayMerchant` | `LankaPayMerchant` | `string` |
| `MCC` | — | `{ FUEL; GOVERNMENT; RELIGIOUS; P2P }` constants |

`EncodeResult`, `DecodeResult`, and `MerchantParseResult` are discriminated unions: `{ ok: true; … }` on success, `{ ok: false; reason }` on failure. The `MCC` constants are the four CBSL-mandated category codes: fuel (`5542`), government (`9399`), religious (`8661`), and P2P (`4829`).

## Conformance levels

The library distinguishes two levels of strictness (SPEC §8):

1. **EMVCo well-formed** — the TLV parses, every declared length is consistent, the CRC matches, and tag 63 is last. This is what `decode` requires. A payload that is well-formed but not Sri Lankan (for example, currency `840` for USD) still decodes, and the returned data faithfully reflects it.
2. **LankaQR-conformant** — EMVCo well-formed **plus** country code `LK`, currency `144`, at least one of tag 26/27 present, and a reference label (tag 62 sub-05). This is what `isValid` requires to return `true`.

The split is deliberate: use `decode` to inspect any payload (including foreign ones), and `isValid` to gate CBSL compliance.

## Limitations

- **No QR image rendering.** This library produces the payload string only — pair it with [`qrcode`](https://www.npmjs.com/package/qrcode) to render a PNG or SVG.
- **No camera/image decoding.** To extract a payload string from a scanned image, pair with [`jsQR`](https://www.npmjs.com/package/jsqr) or similar.
- **LankaPay reserved sub-fields are opaque.** Tags 80–99 and tag 62 sub-tags 60–61 are preserved as pass-through strings in `reservedFields`; their internal structure is defined by Network Facilitator documents that are not public.

## References

- [LANKAQR Specification V1.3, Central Bank of Sri Lanka, January 2026 (Circular PSD 02/2026)](https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/laws/cdg/psd_circular_no_02_of_2026_e.pdf)
- [EMV® QR Code Specification for Payment Systems — Merchant-Presented Mode, Version 1.1, EMVCo, November 2020](https://www.emvco.com/specifications/)

## Licence

MIT
