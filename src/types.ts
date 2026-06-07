export type LankaPayMerchant = {
  networkType: string;
  bankCode: string;
  subAcquirer: string;
  merchantId: string;
  terminalId: string;
};

export type TipIndicator =
  | { type: "prompt" }
  | { type: "fixed"; amount: string }
  | { type: "percentage"; value: string };

export type AlternateLanguage = {
  languageCode: string;
  merchantName: string;
  merchantCity?: string;
};

export type LankaQRInput = {
  pointOfInitiation: "static" | "dynamic";
  merchantAccount: LankaPayMerchant | { raw: string };
  merchantAccountTag: "26" | "27";
  merchantCategoryCode: string;
  merchantName: string;
  merchantCity: string;
  referenceLabel: string;
  transactionAmount?: string;
  postalCode?: string;
  tipIndicator?: TipIndicator;
  alternateLanguage?: AlternateLanguage;
};

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
  rawTags: Record<string, string>;
  reservedFields: Record<string, string>;
};

export type EncodeResult = { ok: true; payload: string } | { ok: false; reason: string };

export type DecodeResult = { ok: true; data: LankaQRData } | { ok: false; reason: string };

export type MerchantParseResult =
  | { ok: true; merchant: LankaPayMerchant }
  | { ok: false; reason: string };
