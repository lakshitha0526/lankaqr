import { describe, expect, it } from "vitest";
// These mirror the README examples verbatim, except the import path: the README
// imports from "lankaqr", here we import from the source under test. If a README
// example stops compiling or running, this file fails.
import {
  decode,
  encode,
  formatLankaPayMerchant,
  isValid,
  parseLankaPayMerchant,
} from "../src/index";

// The static payload string used in the README's decode and validate examples.
const STATIC_PAYLOAD =
  "000201010211262817056001MERCHANT00000001T0015204599953031445802LK5910ACME STORE6007COLOMBO62110507INV-0016304D4F0";

describe("README examples", () => {
  it("encode a static QR (minimal input)", () => {
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

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload).toBe(STATIC_PAYLOAD);
  });

  it("encode a dynamic QR with amount, tip, and alternate language", () => {
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

    expect(result.ok).toBe(true);
    if (result.ok) expect(isValid(result.payload)).toBe(true);
  });

  it("decode a payload", () => {
    const result = decode(STATIC_PAYLOAD);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const { data } = result;
      expect(data.merchantName).toBe("ACME STORE");
      expect(data.referenceLabel).toBe("INV-001");
      expect(data.merchantAccount.parsed?.bankCode).toBe("7056");
    }
  });

  it("validate conformance", () => {
    expect(isValid(STATIC_PAYLOAD)).toBe(true);
  });

  it("parse and format a LankaPay merchant block", () => {
    const parsed = parseLankaPayMerchant("17056001MERCHANT00000001T001");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.merchant.bankCode).toBe("7056");

    const raw = formatLankaPayMerchant({
      networkType: "1",
      bankCode: "7056",
      subAcquirer: "001",
      merchantId: "MERCHANT00000001",
      terminalId: "T001",
    });
    expect(raw).toBe("17056001MERCHANT00000001T001");
  });
});
