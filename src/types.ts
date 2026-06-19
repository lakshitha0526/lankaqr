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
  merchantAccountTag: "26" | "27" | null;
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

export type EncodeFailureReason =
  | "merchant account invalid"
  | "invalid mcc"
  | "merchant name required"
  | "merchant name too long"
  | "merchant city required"
  | "merchant city too long"
  | "reference label required"
  | "reference label too long"
  | "transaction amount too long"
  | "invalid tip indicator"
  | "tip amount required"
  | "tip percentage required"
  | "postal code too long"
  | "alternate language code invalid"
  | "alternate merchant name too long"
  | "alternate merchant city too long";

export type EncodeResult =
  | { ok: true; payload: string }
  | { ok: false; reason: EncodeFailureReason };

export type DecodeFailureReason =
  | "empty payload"
  | "tlv parse failed"
  | "invalid crc"
  | "crc tag must be last"
  | "missing payload format indicator"
  | "invalid point of initiation"
  | "duplicate tag"
  | "missing merchant account";

export type DecodeResult =
  | { ok: true; data: LankaQRData }
  | { ok: false; reason: DecodeFailureReason };

export type MerchantParseResult =
  | { ok: true; merchant: LankaPayMerchant }
  | { ok: false; reason: string };
