import { describe, expect, it } from "vitest";
import { computeCRC, encode, isValid, serializeTLV } from "../src/index";
import type { TLVNode } from "../src/tlv";
import type { LankaQRInput } from "../src/types";

const SAMPLE_RAW = "17056001MERCHANT00000001T001";

function baseInput(overrides: Partial<LankaQRInput> = {}): LankaQRInput {
  return {
    pointOfInitiation: "static",
    merchantAccount: { raw: SAMPLE_RAW },
    merchantAccountTag: "26",
    merchantCategoryCode: "4829",
    merchantName: "ACME STORE",
    merchantCity: "COLOMBO",
    referenceLabel: "REF123",
    ...overrides,
  };
}

function encodedPayload(overrides: Partial<LankaQRInput> = {}): string {
  const result = encode(baseInput(overrides));
  if (!result.ok) throw new Error(`encode failed: ${result.reason}`);
  return result.payload;
}

function withCRC(body: string): string {
  const covered = `${body}6304`;
  return covered + computeCRC(covered);
}

// Builds a decodable payload with overridable conformance-relevant fields, so
// non-conformant cases (foreign country, foreign currency, no merchant account,
// no reference label) can be constructed — encode() forces these to be valid.
function customPayload(opts: {
  country?: string;
  currency?: string;
  merchantTag?: "26" | "27" | "none";
  referenceLabel?: string | null;
}): string {
  const nodes: TLVNode[] = [
    { tag: "00", value: "01" },
    { tag: "01", value: "11" },
  ];
  if (opts.merchantTag !== "none") {
    nodes.push({ tag: opts.merchantTag ?? "26", value: SAMPLE_RAW });
  }
  nodes.push({ tag: "52", value: "4829" });
  nodes.push({ tag: "53", value: opts.currency ?? "144" });
  nodes.push({ tag: "58", value: opts.country ?? "LK" });
  nodes.push({ tag: "59", value: "ACME STORE" });
  nodes.push({ tag: "60", value: "COLOMBO" });
  if (opts.referenceLabel !== null) {
    nodes.push({
      tag: "62",
      value: serializeTLV([{ tag: "05", value: opts.referenceLabel ?? "REF123" }]),
    });
  }
  return withCRC(serializeTLV(nodes));
}

describe("isValid — conformant payloads", () => {
  it("(a) accepts a valid static LankaQR payload", () => {
    expect(isValid(encodedPayload())).toBe(true);
  });

  it("(b) accepts a valid dynamic LankaQR payload", () => {
    expect(
      isValid(encodedPayload({ pointOfInitiation: "dynamic", transactionAmount: "1500.00" })),
    ).toBe(true);
  });

  it("(c) accepts a payload with a Sinhala alternate language template", () => {
    expect(
      isValid(
        encodedPayload({
          alternateLanguage: { languageCode: "SI", merchantName: "සාප්පුව", merchantCity: "කොළඹ" },
        }),
      ),
    ).toBe(true);
  });

  it("(d) accepts a payload carrying a tip indicator", () => {
    expect(isValid(encodedPayload({ tipIndicator: { type: "fixed", amount: "50.00" } }))).toBe(
      true,
    );
  });

  it("(e) accepts a payload where both tag 26 and tag 27 are present", () => {
    const payload = encodedPayload(); // already has tag 26
    const body = payload.slice(0, payload.lastIndexOf("6304"));
    expect(isValid(withCRC(`${body}27${SAMPLE_RAW.length}${SAMPLE_RAW}`))).toBe(true);
  });
});

describe("isValid — non-conformant payloads", () => {
  it("(f) rejects a payload with country code CN", () => {
    expect(isValid(customPayload({ country: "CN" }))).toBe(false);
  });

  it("(g) rejects a payload with currency 840 (USD)", () => {
    expect(isValid(customPayload({ currency: "840" }))).toBe(false);
  });

  it("(h) rejects a payload missing the reference label", () => {
    expect(isValid(customPayload({ referenceLabel: null }))).toBe(false);
  });

  it("(i) rejects a payload with neither tag 26 nor tag 27", () => {
    expect(isValid(customPayload({ merchantTag: "none" }))).toBe(false);
  });
});

describe("isValid — malformed input", () => {
  it("(j) rejects a payload with a bad CRC", () => {
    const valid = encodedPayload();
    const tampered = `${valid.slice(0, -1)}${valid.endsWith("0") ? "1" : "0"}`;
    expect(isValid(tampered)).toBe(false);
  });

  it("(k) rejects an empty payload", () => {
    expect(isValid("")).toBe(false);
  });

  it("(l) rejects garbage input", () => {
    expect(isValid(withCRC("AB"))).toBe(false);
  });
});
