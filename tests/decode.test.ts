import { describe, expect, it } from "vitest";
import { computeCRC, decode, encode, serializeTLV } from "../src/index";
import type { LankaQRData, LankaQRInput } from "../src/types";

// Canonical EMVCo MPM test vector (SPEC Appendix B). CN/CNY — NOT LankaQR-conformant,
// but must still decode at the EMVCo-well-formed level.
const CANONICAL_CN =
  "00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING64200002ZH0104最佳运输0202北京540523.7253031565502016233030412340603***0708A60086670902ME91320016A0112233449988770708123456786304A13A";

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

function decoded(payload: string): LankaQRData {
  const result = decode(payload);
  if (!result.ok) throw new Error(`decode failed: ${result.reason}`);
  return result.data;
}

// Wraps a body (everything before tag 63) with a valid CRC, mirroring encode().
function withCRC(body: string): string {
  const covered = `${body}6304`;
  return covered + computeCRC(covered);
}

// Replaces the trailing CRC tag with `extra` inserted before it, re-checksummed.
function spliceBeforeCRC(payload: string, extra: string): string {
  const body = payload.slice(0, payload.lastIndexOf("6304"));
  return withCRC(body + extra);
}

describe("decode — well-formed payloads", () => {
  it("(a) decodes the canonical foreign CN/CNY EMVCo vector without enforcing LankaQR rules", () => {
    const data = decoded(CANONICAL_CN);
    expect(data.payloadFormatIndicator).toBe("01");
    expect(data.pointOfInitiation).toBe("dynamic");
    expect(data.countryCode).toBe("CN");
    expect(data.transactionCurrency).toBe("156");
    expect(data.merchantName).toBe("BEST TRANSPORT");
    expect(data.merchantCity).toBe("BEIJING");
    expect(data.transactionAmount).toBe("23.72");
    expect(data.tipIndicator).toEqual({ type: "prompt" });
    // No tag 26/27 present — merchant account stays empty, tag is null (permissive).
    expect(data.merchantAccountTag).toBeNull();
    expect(data.merchantAccount).toEqual({ raw: "", parsed: null });
    // Tags 29, 31, 91 are unrecognised merchant/reserved templates → reservedFields.
    expect(data.reservedFields["29"]).toBeDefined();
    expect(data.reservedFields["31"]).toBeDefined();
    expect(data.reservedFields["91"]).toBeDefined();
    // Alternate-language template (tag 64) with UTF-8 Chinese, length-as-char-count.
    expect(data.alternateLanguage).toEqual({
      languageCode: "ZH",
      merchantName: "最佳运输",
      merchantCity: "北京",
    });
    expect(data.crc).toBe("A13A");
  });

  it("(b) decodes a minimal LankaQR static payload", () => {
    const data = decoded(encodedPayload());
    expect(data.pointOfInitiation).toBe("static");
    expect(data.countryCode).toBe("LK");
    expect(data.transactionCurrency).toBe("144");
    expect(data.merchantCategoryCode).toBe("4829");
    expect(data.merchantName).toBe("ACME STORE");
    expect(data.merchantCity).toBe("COLOMBO");
    expect(data.referenceLabel).toBe("REF123");
    expect(data.transactionAmount).toBeNull();
    expect(data.postalCode).toBeNull();
    expect(data.tipIndicator).toBeNull();
    expect(data.alternateLanguage).toBeNull();
  });

  it("(c) decodes a dynamic payload with a transaction amount", () => {
    const data = decoded(
      encodedPayload({ pointOfInitiation: "dynamic", transactionAmount: "1500.00" }),
    );
    expect(data.pointOfInitiation).toBe("dynamic");
    expect(data.transactionAmount).toBe("1500.00");
  });

  it("(d) parses a structured 28-char merchant block under tag 26", () => {
    const data = decoded(encodedPayload());
    expect(data.merchantAccountTag).toBe("26");
    expect(data.merchantAccount.raw).toBe(SAMPLE_RAW);
    expect(data.merchantAccount.parsed).toEqual({
      networkType: "1",
      bankCode: "7056",
      subAcquirer: "001",
      merchantId: "MERCHANT00000001",
      terminalId: "T001",
    });
  });

  it("(e) decodes all optional fields populated", () => {
    const data = decoded(
      encodedPayload({
        pointOfInitiation: "dynamic",
        transactionAmount: "250.50",
        postalCode: "00100",
        tipIndicator: { type: "fixed", amount: "50.00" },
        alternateLanguage: { languageCode: "SI", merchantName: "සාප්පුව", merchantCity: "කොළඹ" },
      }),
    );
    expect(data.postalCode).toBe("00100");
    expect(data.tipIndicator).toEqual({ type: "fixed", amount: "50.00" });
    expect(data.alternateLanguage).toEqual({
      languageCode: "SI",
      merchantName: "සාප්පුව",
      merchantCity: "කොළඹ",
    });
  });
});

describe("decode — tip indicator", () => {
  it("(f) decodes a prompt tip", () => {
    expect(decoded(encodedPayload({ tipIndicator: { type: "prompt" } })).tipIndicator).toEqual({
      type: "prompt",
    });
  });

  it("(g) decodes a fixed tip with its amount", () => {
    expect(
      decoded(encodedPayload({ tipIndicator: { type: "fixed", amount: "20.00" } })).tipIndicator,
    ).toEqual({ type: "fixed", amount: "20.00" });
  });

  it("(h) decodes a percentage tip with its value", () => {
    expect(
      decoded(encodedPayload({ tipIndicator: { type: "percentage", value: "5.5" } })).tipIndicator,
    ).toEqual({ type: "percentage", value: "5.5" });
  });
});

describe("decode — alternate language", () => {
  it("(i) decodes a Sinhala alternate language template with a city", () => {
    const data = decoded(
      encodedPayload({
        alternateLanguage: { languageCode: "SI", merchantName: "සාප්පුව", merchantCity: "කොළඹ" },
      }),
    );
    expect(data.alternateLanguage).toEqual({
      languageCode: "SI",
      merchantName: "සාප්පුව",
      merchantCity: "කොළඹ",
    });
  });

  it("(j) decodes a Tamil alternate language template without a city", () => {
    const data = decoded(
      encodedPayload({ alternateLanguage: { languageCode: "TA", merchantName: "கடை" } }),
    );
    expect(data.alternateLanguage).toEqual({ languageCode: "TA", merchantName: "கடை" });
  });
});

describe("decode — reserved / pass-through fields", () => {
  it("(k) routes an unknown top-level tag 80 into reservedFields", () => {
    const data = decoded(spliceBeforeCRC(encodedPayload(), "8004TEST"));
    expect(data.reservedFields["80"]).toBe("TEST");
  });

  it("(l) routes tag 62 sub-tags 60 and 61 into reservedFields", () => {
    const data62 = serializeTLV([
      { tag: "05", value: "REF123" },
      { tag: "60", value: "AAAA" },
      { tag: "61", value: "BBBB" },
    ]);
    const body = serializeTLV([
      { tag: "00", value: "01" },
      { tag: "01", value: "11" },
      { tag: "62", value: data62 },
    ]);
    const data = decoded(withCRC(body));
    expect(data.referenceLabel).toBe("REF123");
    expect(data.reservedFields["62.60"]).toBe("AAAA");
    expect(data.reservedFields["62.61"]).toBe("BBBB");
  });

  it("(m) routes an unknown tag 64 sub-tag into reservedFields", () => {
    const data64 = serializeTLV([
      { tag: "00", value: "SI" },
      { tag: "01", value: "NAME" },
      { tag: "09", value: "XYZ" },
    ]);
    const body = serializeTLV([
      { tag: "00", value: "01" },
      { tag: "01", value: "11" },
      { tag: "64", value: data64 },
    ]);
    const data = decoded(withCRC(body));
    expect(data.reservedFields["64.09"]).toBe("XYZ");
    expect(data.alternateLanguage).toEqual({ languageCode: "SI", merchantName: "NAME" });
  });

  it("(n) leaves merchantAccount.parsed null when the block is not 28 chars", () => {
    const body = serializeTLV([
      { tag: "00", value: "01" },
      { tag: "01", value: "11" },
      { tag: "26", value: "SHORTBLOCK" },
    ]);
    const data = decoded(withCRC(body));
    expect(data.merchantAccountTag).toBe("26");
    expect(data.merchantAccount.raw).toBe("SHORTBLOCK");
    expect(data.merchantAccount.parsed).toBeNull();
  });

  it("(o) keeps tag 26 and routes tag 27 to reservedFields when both are present", () => {
    const data = decoded(spliceBeforeCRC(encodedPayload(), `2728${SAMPLE_RAW}`));
    expect(data.merchantAccountTag).toBe("26");
    expect(data.merchantAccount.raw).toBe(SAMPLE_RAW);
    expect(data.reservedFields["27"]).toBe(SAMPLE_RAW);
  });
});

describe("decode — failures", () => {
  function reasonOf(payload: string): string {
    const result = decode(payload);
    if (result.ok) throw new Error("expected ok:false");
    return result.reason;
  }

  it("(p) rejects empty input", () => {
    expect(reasonOf("")).toBe("empty payload");
  });

  it("(q) rejects a payload with a bad CRC", () => {
    const valid = encodedPayload();
    const tampered = `${valid.slice(0, -1)}${valid.endsWith("0") ? "1" : "0"}`;
    expect(reasonOf(tampered)).toBe("invalid crc");
  });

  it("(r) rejects garbage that is not valid TLV", () => {
    // "AB6304…" passes the CRC check but parseTLV chokes on the non-numeric tag.
    expect(reasonOf(withCRC("AB"))).toBe("tlv parse failed");
  });

  it("(s) rejects a payload whose CRC tag is not last", () => {
    // A single tag-59 node whose value ends in "6304"+crc: CRC verifies, but the
    // last parsed tag is 59, not 63.
    const payload = `59086304${computeCRC("59086304")}`;
    expect(reasonOf(payload)).toBe("crc tag must be last");
  });

  it("(t) rejects a duplicate top-level tag", () => {
    const body = serializeTLV([
      { tag: "00", value: "01" },
      { tag: "01", value: "11" },
      { tag: "53", value: "144" },
      { tag: "53", value: "144" },
    ]);
    expect(reasonOf(withCRC(body))).toBe("duplicate tag");
  });

  it("(u) rejects a missing/invalid payload format indicator", () => {
    const body = serializeTLV([
      { tag: "00", value: "02" },
      { tag: "01", value: "11" },
    ]);
    expect(reasonOf(withCRC(body))).toBe("missing payload format indicator");
  });

  it("(v) rejects an invalid point of initiation", () => {
    const body = serializeTLV([
      { tag: "00", value: "01" },
      { tag: "01", value: "99" },
    ]);
    expect(reasonOf(withCRC(body))).toBe("invalid point of initiation");
  });
});
