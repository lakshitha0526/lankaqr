import { computeCRC } from "./crc";
import { formatLankaPayMerchant } from "./merchant";
import {
  COUNTRY_CODE_LK,
  CURRENCY_LKR,
  MERCHANT_BLOCK_LENGTH,
  PAYLOAD_FORMAT_INDICATOR,
  POI_DYNAMIC,
  POI_STATIC,
  SUBTAG_ALTERNATE_MERCHANT_CITY,
  SUBTAG_ALTERNATE_MERCHANT_NAME,
  SUBTAG_LANGUAGE_PREFERENCE,
  SUBTAG_REFERENCE_LABEL,
  TAG_ADDITIONAL_DATA,
  TAG_ALTERNATE_LANGUAGE,
  TAG_CONVENIENCE_FEE_FIXED,
  TAG_CONVENIENCE_FEE_PERCENTAGE,
  TAG_COUNTRY_CODE,
  TAG_MCC,
  TAG_MERCHANT_CITY,
  TAG_MERCHANT_NAME,
  TAG_PAYLOAD_FORMAT_INDICATOR,
  TAG_POINT_OF_INITIATION,
  TAG_POSTAL_CODE,
  TAG_TIP_INDICATOR,
  TAG_TRANSACTION_AMOUNT,
  TAG_TRANSACTION_CURRENCY,
  TIP_INDICATOR_FIXED,
  TIP_INDICATOR_PERCENTAGE,
  TIP_INDICATOR_PROMPT,
} from "./tags";
import { serializeTLV, type TLVNode } from "./tlv";
import type {
  AlternateLanguage,
  EncodeFailureReason,
  EncodeResult,
  LankaPayMerchant,
  LankaQRInput,
  TipIndicator,
} from "./types";

const MCC_PATTERN = /^\d{4}$/;

const MAX_MERCHANT_NAME = 25;
const MAX_MERCHANT_CITY = 15;
const MAX_REFERENCE_LABEL = 25;
const MAX_TRANSACTION_AMOUNT = 13;
const MAX_POSTAL_CODE = 10;
const LANGUAGE_CODE_LENGTH = 2;

/** Marker for the CRC tag (tag "63", length "04"), appended before the checksum. */
const CRC_MARKER = "6304";

function buildMerchantBlock(account: LankaPayMerchant | { raw: string }): string | null {
  if ("raw" in account) {
    return account.raw.length === MERCHANT_BLOCK_LENGTH ? account.raw : null;
  }
  try {
    return formatLankaPayMerchant(account);
  } catch {
    return null;
  }
}

function buildTipNodes(tip: TipIndicator): TLVNode[] | EncodeFailureReason {
  switch (tip.type) {
    case "prompt":
      return [{ tag: TAG_TIP_INDICATOR, value: TIP_INDICATOR_PROMPT }];
    case "fixed":
      if (!tip.amount) return "tip amount required";
      return [
        { tag: TAG_TIP_INDICATOR, value: TIP_INDICATOR_FIXED },
        { tag: TAG_CONVENIENCE_FEE_FIXED, value: tip.amount },
      ];
    case "percentage":
      if (!tip.value) return "tip percentage required";
      return [
        { tag: TAG_TIP_INDICATOR, value: TIP_INDICATOR_PERCENTAGE },
        { tag: TAG_CONVENIENCE_FEE_PERCENTAGE, value: tip.value },
      ];
    default:
      return "invalid tip indicator";
  }
}

function buildAlternateLanguageNode(alt: AlternateLanguage): TLVNode | EncodeFailureReason {
  if (alt.languageCode.length !== LANGUAGE_CODE_LENGTH) return "alternate language code invalid";
  if (alt.merchantName.length > MAX_MERCHANT_NAME) return "alternate merchant name too long";
  if (alt.merchantCity !== undefined && alt.merchantCity.length > MAX_MERCHANT_CITY) {
    return "alternate merchant city too long";
  }
  const sub: TLVNode[] = [
    { tag: SUBTAG_LANGUAGE_PREFERENCE, value: alt.languageCode },
    { tag: SUBTAG_ALTERNATE_MERCHANT_NAME, value: alt.merchantName },
  ];
  if (alt.merchantCity !== undefined) {
    sub.push({ tag: SUBTAG_ALTERNATE_MERCHANT_CITY, value: alt.merchantCity });
  }
  return { tag: TAG_ALTERNATE_LANGUAGE, value: serializeTLV(sub) };
}

/**
 * Encodes a structured LankaQR input into a CBSL V1.3 / EMVCo MPM payload string.
 *
 * Tag 00 (payload format), tag 53 (currency = 144 LKR) and tag 58 (country = LK)
 * are forced constants and are not user-configurable by design. Nodes are emitted
 * in canonical order and a CRC-16/CCITT-FALSE checksum is appended as tag 63.
 *
 * Returns `{ ok: false, reason }` for any length or required-combination violation;
 * the payload string is only produced on success.
 */
export function encode(input: LankaQRInput): EncodeResult {
  const merchantBlock = buildMerchantBlock(input.merchantAccount);
  if (merchantBlock === null) return { ok: false, reason: "merchant account invalid" };

  if (!MCC_PATTERN.test(input.merchantCategoryCode)) return { ok: false, reason: "invalid mcc" };

  if (input.merchantName.length === 0) return { ok: false, reason: "merchant name required" };
  if (input.merchantName.length > MAX_MERCHANT_NAME) {
    return { ok: false, reason: "merchant name too long" };
  }

  if (input.merchantCity.length === 0) return { ok: false, reason: "merchant city required" };
  if (input.merchantCity.length > MAX_MERCHANT_CITY) {
    return { ok: false, reason: "merchant city too long" };
  }

  if (input.referenceLabel.length === 0) return { ok: false, reason: "reference label required" };
  if (input.referenceLabel.length > MAX_REFERENCE_LABEL) {
    return { ok: false, reason: "reference label too long" };
  }

  if (
    input.transactionAmount !== undefined &&
    input.transactionAmount.length > MAX_TRANSACTION_AMOUNT
  ) {
    return { ok: false, reason: "transaction amount too long" };
  }

  if (input.postalCode !== undefined && input.postalCode.length > MAX_POSTAL_CODE) {
    return { ok: false, reason: "postal code too long" };
  }

  const poi = input.pointOfInitiation === "static" ? POI_STATIC : POI_DYNAMIC;

  const nodes: TLVNode[] = [
    { tag: TAG_PAYLOAD_FORMAT_INDICATOR, value: PAYLOAD_FORMAT_INDICATOR },
    { tag: TAG_POINT_OF_INITIATION, value: poi },
    { tag: input.merchantAccountTag, value: merchantBlock },
    { tag: TAG_MCC, value: input.merchantCategoryCode },
    { tag: TAG_TRANSACTION_CURRENCY, value: CURRENCY_LKR },
    { tag: TAG_COUNTRY_CODE, value: COUNTRY_CODE_LK },
    { tag: TAG_MERCHANT_NAME, value: input.merchantName },
    { tag: TAG_MERCHANT_CITY, value: input.merchantCity },
  ];

  if (input.transactionAmount !== undefined) {
    nodes.push({ tag: TAG_TRANSACTION_AMOUNT, value: input.transactionAmount });
  }

  if (input.tipIndicator !== undefined) {
    const tipNodes = buildTipNodes(input.tipIndicator);
    if (!Array.isArray(tipNodes)) return { ok: false, reason: tipNodes };
    nodes.push(...tipNodes);
  }

  if (input.postalCode !== undefined) {
    nodes.push({ tag: TAG_POSTAL_CODE, value: input.postalCode });
  }

  nodes.push({
    tag: TAG_ADDITIONAL_DATA,
    value: serializeTLV([{ tag: SUBTAG_REFERENCE_LABEL, value: input.referenceLabel }]),
  });

  if (input.alternateLanguage !== undefined) {
    const altNode = buildAlternateLanguageNode(input.alternateLanguage);
    if (typeof altNode === "string") return { ok: false, reason: altNode };
    nodes.push(altNode);
  }

  const body = serializeTLV(nodes);
  const crc = computeCRC(body + CRC_MARKER);
  return { ok: true, payload: `${body}${CRC_MARKER}${crc}` };
}
