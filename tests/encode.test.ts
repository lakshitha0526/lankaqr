import { describe, expect, it } from "vitest";
import { encode, parseTLV, verifyCRC } from "../src/index";
import type { LankaPayMerchant, LankaQRInput, TipIndicator } from "../src/types";

// 1 + 4 + 3 + 16 + 4 = 28 chars — shared with merchant.test.ts shape
const SAMPLE_MERCHANT: LankaPayMerchant = {
  networkType: "1",
  bankCode: "7056",
  subAcquirer: "001",
  merchantId: "MERCHANT00000001",
  terminalId: "T001",
};
const SAMPLE_RAW = "17056001MERCHANT00000001T001";

function baseInput(overrides: Partial<LankaQRInput> = {}): LankaQRInput {
  return {
    pointOfInitiation: "static",
    merchantAccount: SAMPLE_MERCHANT,
    merchantAccountTag: "26",
    merchantCategoryCode: "4829",
    merchantName: "ACME STORE",
    merchantCity: "COLOMBO",
    referenceLabel: "REF123",
    ...overrides,
  };
}

function payloadOf(input: LankaQRInput): string {
  const result = encode(input);
  if (!result.ok) throw new Error(`expected ok:true, got reason: ${result.reason}`);
  return result.payload;
}

function tagsOf(payload: string): string[] {
  return parseTLV(payload).map((node) => node.tag);
}

describe("encode — happy paths", () => {
  it("(a) builds a minimal static payload in canonical tag order with a valid CRC", () => {
    const payload = payloadOf(baseInput());
    expect(tagsOf(payload)).toEqual(["00", "01", "26", "52", "53", "58", "59", "60", "62", "63"]);
    expect(payload.startsWith("000201")).toBe(true); // tag 00 = "01" forced
    expect(payload).toContain("010211"); // static POI
    expect(payload).toContain("5303144"); // currency forced to 144
    expect(payload).toContain("5802LK"); // country forced to LK
    expect(verifyCRC(payload)).toBe(true);
  });

  it("(b) builds a dynamic payload with a transaction amount", () => {
    const payload = payloadOf(
      baseInput({ pointOfInitiation: "dynamic", transactionAmount: "1500.00" }),
    );
    expect(payload).toContain("010212"); // dynamic POI
    expect(payload).toContain("54071500.00");
    const tags = tagsOf(payload);
    expect(tags).toContain("54");
    expect(verifyCRC(payload)).toBe(true);
  });

  it("(c) builds a payload with every optional field populated", () => {
    const payload = payloadOf(
      baseInput({
        pointOfInitiation: "dynamic",
        transactionAmount: "250.50",
        postalCode: "00100",
        tipIndicator: { type: "fixed", amount: "50.00" },
        alternateLanguage: { languageCode: "SI", merchantName: "සාප්පුව", merchantCity: "කොළඹ" },
      }),
    );
    expect(tagsOf(payload)).toEqual([
      "00",
      "01",
      "26",
      "52",
      "53",
      "58",
      "59",
      "60",
      "54",
      "55",
      "56",
      "61",
      "62",
      "64",
      "63",
    ]);
    expect(verifyCRC(payload)).toBe(true);
  });

  it("(d) builds a payload with only a postal code among the optionals", () => {
    const payload = payloadOf(baseInput({ postalCode: "10250" }));
    expect(payload).toContain("610510250"); // tag 61, length 05, value 10250
    expect(tagsOf(payload)).toContain("61");
    expect(verifyCRC(payload)).toBe(true);
  });
});

describe("encode — tip indicator", () => {
  it("(e) emits tag 55 = 01 and no 56/57 for a prompt tip", () => {
    const payload = payloadOf(baseInput({ tipIndicator: { type: "prompt" } }));
    expect(payload).toContain("550201");
    const tags = tagsOf(payload);
    expect(tags).toContain("55");
    expect(tags).not.toContain("56");
    expect(tags).not.toContain("57");
    expect(verifyCRC(payload)).toBe(true);
  });

  it("(f) emits tag 55 = 02 and tag 56 for a fixed tip", () => {
    const payload = payloadOf(baseInput({ tipIndicator: { type: "fixed", amount: "20.00" } }));
    expect(payload).toContain("550202");
    expect(payload).toContain("560520.00");
    expect(tagsOf(payload)).toContain("56");
    expect(verifyCRC(payload)).toBe(true);
  });

  it("(g) emits tag 55 = 03 and tag 57 for a percentage tip", () => {
    const payload = payloadOf(baseInput({ tipIndicator: { type: "percentage", value: "5.5" } }));
    expect(payload).toContain("550203");
    expect(payload).toContain("57035.5");
    expect(tagsOf(payload)).toContain("57");
    expect(verifyCRC(payload)).toBe(true);
  });
});

describe("encode — alternate language", () => {
  it("(h) builds a Sinhala alternate language template (name + city)", () => {
    const payload = payloadOf(
      baseInput({
        alternateLanguage: { languageCode: "SI", merchantName: "සාප්පුව", merchantCity: "කොළඹ" },
      }),
    );
    expect(payload).toContain("0002SI"); // sub-tag 00 = language preference
    expect(tagsOf(payload)).toContain("64");
    expect(verifyCRC(payload)).toBe(true);
  });

  it("(i) builds a Tamil alternate language template with no city sub-tag", () => {
    const payload = payloadOf(
      baseInput({ alternateLanguage: { languageCode: "TA", merchantName: "கடை" } }),
    );
    expect(payload).toContain("0002TA");
    // tag 64 inner should hold only sub-tags 00 and 01, not 02
    const node64 = parseTLV(payload).find((n) => n.tag === "64");
    if (!node64) throw new Error("expected tag 64 to be present");
    expect(parseTLV(node64.value).map((n) => n.tag)).toEqual(["00", "01"]);
    expect(verifyCRC(payload)).toBe(true);
  });
});

describe("encode — merchant account variants", () => {
  it("(j) emits the LankaPay block under tag 26", () => {
    const payload = payloadOf(baseInput({ merchantAccountTag: "26" }));
    expect(payload).toContain(`26${SAMPLE_RAW.length}${SAMPLE_RAW}`);
  });

  it("(k) emits the LankaPay block under tag 27", () => {
    const payload = payloadOf(baseInput({ merchantAccountTag: "27" }));
    expect(payload).toContain(`27${SAMPLE_RAW.length}${SAMPLE_RAW}`);
    expect(tagsOf(payload)).toContain("27");
  });

  it("(l) accepts a raw 28-char merchant block via the escape hatch", () => {
    const payload = payloadOf(baseInput({ merchantAccount: { raw: SAMPLE_RAW } }));
    expect(payload).toContain(`2628${SAMPLE_RAW}`);
    expect(verifyCRC(payload)).toBe(true);
  });
});

describe("encode — failure reasons", () => {
  function reasonOf(input: LankaQRInput): string {
    const result = encode(input);
    if (result.ok) throw new Error("expected ok:false");
    return result.reason;
  }

  it("(m) rejects a raw merchant block that is not 28 chars", () => {
    expect(reasonOf(baseInput({ merchantAccount: { raw: "SHORT" } }))).toBe(
      "merchant account invalid",
    );
  });

  it("(n) rejects a structured merchant with a malformed field", () => {
    expect(reasonOf(baseInput({ merchantAccount: { ...SAMPLE_MERCHANT, bankCode: "12" } }))).toBe(
      "merchant account invalid",
    );
  });

  it("(o) rejects a non-4-digit MCC", () => {
    expect(reasonOf(baseInput({ merchantCategoryCode: "48A9" }))).toBe("invalid mcc");
  });

  it("(p) rejects an empty merchant name", () => {
    expect(reasonOf(baseInput({ merchantName: "" }))).toBe("merchant name required");
  });

  it("(q) rejects a merchant name longer than 25 chars", () => {
    expect(reasonOf(baseInput({ merchantName: "X".repeat(26) }))).toBe("merchant name too long");
  });

  it("(r) rejects an empty merchant city", () => {
    expect(reasonOf(baseInput({ merchantCity: "" }))).toBe("merchant city required");
  });

  it("(s) rejects a merchant city longer than 15 chars", () => {
    expect(reasonOf(baseInput({ merchantCity: "X".repeat(16) }))).toBe("merchant city too long");
  });

  it("(t) rejects an empty reference label", () => {
    expect(reasonOf(baseInput({ referenceLabel: "" }))).toBe("reference label required");
  });

  it("(u) rejects a reference label longer than 25 chars", () => {
    expect(reasonOf(baseInput({ referenceLabel: "X".repeat(26) }))).toBe(
      "reference label too long",
    );
  });

  it("(v) rejects a transaction amount longer than 13 chars", () => {
    expect(reasonOf(baseInput({ transactionAmount: "1".repeat(14) }))).toBe(
      "transaction amount too long",
    );
  });

  it("(w) rejects an unknown tip indicator type", () => {
    const bogus = { type: "surprise" } as unknown as TipIndicator;
    expect(reasonOf(baseInput({ tipIndicator: bogus }))).toBe("invalid tip indicator");
  });

  it("(x) rejects a fixed tip with no amount", () => {
    expect(reasonOf(baseInput({ tipIndicator: { type: "fixed", amount: "" } }))).toBe(
      "tip amount required",
    );
  });

  it("(y) rejects a percentage tip with no value", () => {
    expect(reasonOf(baseInput({ tipIndicator: { type: "percentage", value: "" } }))).toBe(
      "tip percentage required",
    );
  });

  it("(z) rejects a postal code longer than 10 chars", () => {
    expect(reasonOf(baseInput({ postalCode: "0".repeat(11) }))).toBe("postal code too long");
  });

  it("(aa) rejects an alternate language code that is not exactly 2 chars", () => {
    expect(
      reasonOf(baseInput({ alternateLanguage: { languageCode: "SIN", merchantName: "x" } })),
    ).toBe("alternate language code invalid");
  });

  it("(ab) rejects an alternate merchant name longer than 25 chars", () => {
    expect(
      reasonOf(
        baseInput({ alternateLanguage: { languageCode: "SI", merchantName: "x".repeat(26) } }),
      ),
    ).toBe("alternate merchant name too long");
  });

  it("(ac) rejects an alternate merchant city longer than 15 chars", () => {
    expect(
      reasonOf(
        baseInput({
          alternateLanguage: {
            languageCode: "SI",
            merchantName: "x",
            merchantCity: "y".repeat(16),
          },
        }),
      ),
    ).toBe("alternate merchant city too long");
  });
});
