// Root-level EMVCo MPM tag IDs
export const TAG_PAYLOAD_FORMAT_INDICATOR = "00";
export const TAG_POINT_OF_INITIATION = "01";
export const TAG_MERCHANT_ACCOUNT_26 = "26";
export const TAG_MERCHANT_ACCOUNT_27 = "27";
export const TAG_MCC = "52";
export const TAG_TRANSACTION_CURRENCY = "53";
export const TAG_TRANSACTION_AMOUNT = "54";
export const TAG_TIP_INDICATOR = "55";
export const TAG_CONVENIENCE_FEE_FIXED = "56";
export const TAG_CONVENIENCE_FEE_PERCENTAGE = "57";
export const TAG_COUNTRY_CODE = "58";
export const TAG_MERCHANT_NAME = "59";
export const TAG_MERCHANT_CITY = "60";
export const TAG_POSTAL_CODE = "61";
export const TAG_ADDITIONAL_DATA = "62";
export const TAG_CRC = "63";
export const TAG_ALTERNATE_LANGUAGE = "64";

// Sub-tags within tag 62 (Additional Data Field Template)
export const SUBTAG_REFERENCE_LABEL = "05";
export const SUBTAG_RESERVED_LANKAPAY_60 = "60";
export const SUBTAG_RESERVED_LANKAPAY_61 = "61";

// Sub-tags within tag 64 (Alternate Language Template)
export const SUBTAG_LANGUAGE_PREFERENCE = "00";
export const SUBTAG_ALTERNATE_MERCHANT_NAME = "01";
export const SUBTAG_ALTERNATE_MERCHANT_CITY = "02";

// Well-known field values
export const PAYLOAD_FORMAT_INDICATOR = "01";
export const POI_STATIC = "11";
export const POI_DYNAMIC = "12";
export const COUNTRY_CODE_LK = "LK";
export const CURRENCY_LKR = "144";
export const TIP_INDICATOR_PROMPT = "01";
export const TIP_INDICATOR_FIXED = "02";
export const TIP_INDICATOR_PERCENTAGE = "03";

// Public — re-exported from index.ts
export const MCC = {
  FUEL: "5542",
  GOVERNMENT: "9399",
  RELIGIOUS: "8661",
  P2P: "4829",
} as const;

// Tags whose values are themselves TLV-encoded (used by encode/decode).
export const NESTED_TAGS: ReadonlySet<string> = new Set([
  TAG_MERCHANT_ACCOUNT_26,
  TAG_MERCHANT_ACCOUNT_27,
  TAG_ADDITIONAL_DATA,
  TAG_ALTERNATE_LANGUAGE,
]);

// LankaPay merchant account block layout (SPEC §7.7)
export const MERCHANT_BLOCK_LENGTH = 28;
export const MERCHANT_NETWORK_TYPE_LENGTH = 1;
export const MERCHANT_BANK_CODE_LENGTH = 4;
export const MERCHANT_SUB_ACQUIRER_LENGTH = 3;
export const MERCHANT_MERCHANT_ID_LENGTH = 16;
export const MERCHANT_TERMINAL_ID_LENGTH = 4;
