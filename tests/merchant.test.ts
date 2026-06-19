import { describe, expect, it } from "vitest";
import { formatLankaPayMerchant, parseLankaPayMerchant } from "../src/index";

const SAMPLE_MERCHANT = {
  networkType: "1",
  bankCode: "7056",
  subAcquirer: "001",
  merchantId: "MERCHANT00000001",
  terminalId: "T001",
};

// 1 + 4 + 3 + 16 + 4 = 28 chars
const SAMPLE_RAW = "17056001MERCHANT00000001T001";

describe("parseLankaPayMerchant", () => {
  it("(a) returns ok:true with correctly sliced fields for a valid 28-char block", () => {
    const result = parseLankaPayMerchant(SAMPLE_RAW);
    if (!result.ok) throw new Error(`expected ok:true, got reason: ${result.reason}`);
    expect(result.merchant).toEqual(SAMPLE_MERCHANT);
  });

  it("(b) returns ok:false for input shorter than 28 chars", () => {
    const result = parseLankaPayMerchant("SHORT");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/28 characters/);
  });

  it("(c) returns ok:false for input longer than 28 chars", () => {
    const result = parseLankaPayMerchant(`${SAMPLE_RAW}X`);
    expect(result.ok).toBe(false);
  });

  it("(d) returns ok:false for empty input", () => {
    const result = parseLankaPayMerchant("");
    expect(result.ok).toBe(false);
  });
});

describe("formatLankaPayMerchant", () => {
  it("(e) returns the expected 28-char string for a valid merchant", () => {
    expect(formatLankaPayMerchant(SAMPLE_MERCHANT)).toBe(SAMPLE_RAW);
  });

  it("(f) throws with singular 'character' when a 1-char field has wrong length", () => {
    // networkType must be exactly 1 character — use 2 chars to trigger singular branch
    expect(() => formatLankaPayMerchant({ ...SAMPLE_MERCHANT, networkType: "12" })).toThrow(
      /1 character/,
    );
  });

  it("(g) throws with plural 'characters' when a multi-char field has wrong length", () => {
    // bankCode must be exactly 4 characters — use 7 chars to trigger plural branch
    expect(() => formatLankaPayMerchant({ ...SAMPLE_MERCHANT, bankCode: "TOOLONG" })).toThrow(
      /4 characters/,
    );
  });

  it("(h) throws on non-alphanumeric content", () => {
    expect(() => formatLankaPayMerchant({ ...SAMPLE_MERCHANT, bankCode: "00!1" })).toThrow(
      /alphanumeric/,
    );
  });
});

describe("round-trip", () => {
  it("(i) parseLankaPayMerchant(formatLankaPayMerchant(input)) deep-equals the input", () => {
    const formatted = formatLankaPayMerchant(SAMPLE_MERCHANT);
    const result = parseLankaPayMerchant(formatted);
    if (!result.ok) throw new Error(`expected ok:true, got reason: ${result.reason}`);
    expect(result.merchant).toEqual(SAMPLE_MERCHANT);
  });
});
