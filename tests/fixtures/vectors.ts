import type { LankaPayMerchant, LankaQRInput } from "../../src/types";

// Canonical structured LankaPay merchant block (shared across test files).
export const SAMPLE_MERCHANT: LankaPayMerchant = {
  networkType: "1",
  bankCode: "7056",
  subAcquirer: "001",
  merchantId: "MERCHANT00000001",
  terminalId: "T001",
};
export const SAMPLE_RAW = "17056001MERCHANT00000001T001";

// A 28-char raw block for the escape-hatch case. It is opaque/non-canonical but
// still 28 chars, so encode() accepts it and decode() slices it structurally.
// (A sub-28 raw cannot roundtrip: encode() rejects it as "merchant account
// invalid"; the parsed:null path is covered directly in decode.test.ts.)
export const OPAQUE_RAW = "90001234ABCDEFGHIJKLMNOPT999";
export const OPAQUE_RAW_PARSED: LankaPayMerchant = {
  networkType: "9",
  bankCode: "0001",
  subAcquirer: "234",
  merchantId: "ABCDEFGHIJKLMNOP",
  terminalId: "T999",
};

function input(overrides: Partial<LankaQRInput>): LankaQRInput {
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

export const STATIC_MINIMAL = input({});

export const DYNAMIC_WITH_AMOUNT = input({
  pointOfInitiation: "dynamic",
  transactionAmount: "1500.00",
});

export const TIP_PROMPT = input({ tipIndicator: { type: "prompt" } });

export const TIP_FIXED = input({ tipIndicator: { type: "fixed", amount: "50.00" } });

export const TIP_PERCENTAGE = input({ tipIndicator: { type: "percentage", value: "5.5" } });

export const ALT_SINHALA = input({
  alternateLanguage: { languageCode: "SI", merchantName: "සාප්පුව", merchantCity: "කොළඹ" },
});

export const ALT_TAMIL = input({
  alternateLanguage: { languageCode: "TA", merchantName: "கடை" },
});

export const ALL_OPTIONAL = input({
  pointOfInitiation: "dynamic",
  transactionAmount: "250.50",
  postalCode: "00100",
  tipIndicator: { type: "fixed", amount: "50.00" },
  alternateLanguage: { languageCode: "SI", merchantName: "සාප්පුව", merchantCity: "කොළඹ" },
});

export const RAW_ESCAPE_HATCH = input({ merchantAccount: { raw: OPAQUE_RAW } });
