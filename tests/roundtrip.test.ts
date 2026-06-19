import { describe, expect, it } from "vitest";
import { decode, encode } from "../src/index";
import type { LankaPayMerchant, LankaQRData, LankaQRInput } from "../src/types";
import {
  ALL_OPTIONAL,
  ALT_SINHALA,
  ALT_TAMIL,
  DYNAMIC_WITH_AMOUNT,
  OPAQUE_RAW,
  OPAQUE_RAW_PARSED,
  RAW_ESCAPE_HATCH,
  SAMPLE_MERCHANT,
  SAMPLE_RAW,
  STATIC_MINIMAL,
  TIP_FIXED,
  TIP_PERCENTAGE,
  TIP_PROMPT,
} from "./fixtures/vectors";

function roundtrip(input: LankaQRInput): LankaQRData {
  const encoded = encode(input);
  if (!encoded.ok) throw new Error(`encode failed: ${encoded.reason}`);
  const decoded = decode(encoded.payload);
  if (!decoded.ok) throw new Error(`decode failed: ${decoded.reason}`);
  return decoded.data;
}

// Asserts that the decoded data reflects the input, with the encoder-forced
// constants (PFI "01", country "LK", currency "144") populated, and every
// optional field round-tripped (absent → null).
function assertRoundtrip(
  input: LankaQRInput,
  expected: { raw: string; parsed: LankaPayMerchant | null },
): LankaQRData {
  const data = roundtrip(input);

  expect(data.payloadFormatIndicator).toBe("01");
  expect(data.countryCode).toBe("LK");
  expect(data.transactionCurrency).toBe("144");

  expect(data.pointOfInitiation).toBe(input.pointOfInitiation);
  expect(data.merchantAccountTag).toBe(input.merchantAccountTag);
  expect(data.merchantCategoryCode).toBe(input.merchantCategoryCode);
  expect(data.merchantName).toBe(input.merchantName);
  expect(data.merchantCity).toBe(input.merchantCity);
  expect(data.referenceLabel).toBe(input.referenceLabel);

  expect(data.transactionAmount).toBe(input.transactionAmount ?? null);
  expect(data.postalCode).toBe(input.postalCode ?? null);
  expect(data.tipIndicator).toEqual(input.tipIndicator ?? null);
  expect(data.alternateLanguage).toEqual(input.alternateLanguage ?? null);

  expect(data.merchantAccount.raw).toBe(expected.raw);
  expect(data.merchantAccount.parsed).toEqual(expected.parsed);

  return data;
}

const STRUCTURED = { raw: SAMPLE_RAW, parsed: SAMPLE_MERCHANT };

describe("roundtrip — encode then decode is structurally lossless", () => {
  it("(a) static minimal", () => {
    assertRoundtrip(STATIC_MINIMAL, STRUCTURED);
  });

  it("(b) dynamic with amount", () => {
    assertRoundtrip(DYNAMIC_WITH_AMOUNT, STRUCTURED);
  });

  it("(c) tip prompt", () => {
    assertRoundtrip(TIP_PROMPT, STRUCTURED);
  });

  it("(d) tip fixed", () => {
    assertRoundtrip(TIP_FIXED, STRUCTURED);
  });

  it("(e) tip percentage", () => {
    assertRoundtrip(TIP_PERCENTAGE, STRUCTURED);
  });

  it("(f) Sinhala alternate language", () => {
    assertRoundtrip(ALT_SINHALA, STRUCTURED);
  });

  it("(g) Tamil alternate language (no alternate city)", () => {
    assertRoundtrip(ALT_TAMIL, STRUCTURED);
  });

  it("(h) all optional fields populated", () => {
    assertRoundtrip(ALL_OPTIONAL, STRUCTURED);
  });

  it("(i) raw merchant escape hatch — raw preserved, parsed sliced from the 28-char block", () => {
    const data = assertRoundtrip(RAW_ESCAPE_HATCH, {
      raw: OPAQUE_RAW,
      parsed: OPAQUE_RAW_PARSED,
    });
    // The input carried no structured merchant fields — only { raw }. The parsed
    // view is derived purely by slicing that raw block, not injected by encode.
    expect("networkType" in RAW_ESCAPE_HATCH.merchantAccount).toBe(false);
    expect(data.merchantAccount.raw).toBe(OPAQUE_RAW);
  });
});
