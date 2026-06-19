import { verifyCRC } from "./crc";
import { parseLankaPayMerchant } from "./merchant";
import {
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
  TAG_CRC,
  TAG_MCC,
  TAG_MERCHANT_ACCOUNT_26,
  TAG_MERCHANT_ACCOUNT_27,
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
import { parseTLV, type TLVNode } from "./tlv";
import type { AlternateLanguage, DecodeResult, LankaPayMerchant, TipIndicator } from "./types";

/**
 * Decodes any EMVCo MPM well-formed payload into a structured `LankaQRData`.
 *
 * This is the permissive layer (SPEC §8 level 1): it requires the TLV to parse,
 * the CRC to match, and tag 63 to be last, but does NOT enforce LankaQR
 * conformance (country `LK`, currency `144`, mandatory merchant account or
 * reference label). A foreign payload — e.g. the canonical CN/CNY EMVCo vector —
 * decodes successfully. Conformance enforcement lives in `isValid()`.
 */
export function decode(payload: string): DecodeResult {
  if (payload.length === 0) return { ok: false, reason: "empty payload" };
  if (!verifyCRC(payload)) return { ok: false, reason: "invalid crc" };

  try {
    // The same catch covers a malformed top-level payload and any malformed
    // nested template (tag 26/27, 62, 64) — both surface as "tlv parse failed".
    return routeNodes(parseTLV(payload));
  } catch {
    return { ok: false, reason: "tlv parse failed" };
  }
}

function routeNodes(nodes: TLVNode[]): DecodeResult {
  // SPEC §7.1: tag 63 (CRC) must be the final tag.
  let lastTag = "";
  for (const node of nodes) lastTag = node.tag;
  if (lastTag !== TAG_CRC) return { ok: false, reason: "crc tag must be last" };

  const rawTags: Record<string, string> = {};
  const reservedFields: Record<string, string> = {};

  let merchantAccountRaw = "";
  let merchantAccountParsed: LankaPayMerchant | null = null;
  let merchantAccountTag: "26" | "27" | null = null;
  let merchantCategoryCode = "";
  let transactionCurrency = "";
  let transactionAmount: string | null = null;
  let countryCode = "";
  let merchantName = "";
  let merchantCity = "";
  let postalCode: string | null = null;
  let referenceLabel = "";
  let crc = "";
  let tip55: string | undefined;
  let tipFixed = "";
  let tipPercentage = "";
  let alternateLanguage: AlternateLanguage | null = null;

  for (const { tag, value } of nodes) {
    if (tag in rawTags) return { ok: false, reason: "duplicate tag" };
    rawTags[tag] = value;

    switch (tag) {
      // 00 and 01 are validated after the loop; their values live in rawTags.
      case TAG_PAYLOAD_FORMAT_INDICATOR:
      case TAG_POINT_OF_INITIATION:
        break;
      case TAG_MERCHANT_ACCOUNT_26:
      case TAG_MERCHANT_ACCOUNT_27:
        // Locked decision 3: if both 26 and 27 are present, 26 wins; the later
        // one falls through to reservedFields as opaque pass-through.
        if (merchantAccountTag === null) {
          merchantAccountTag = tag;
          merchantAccountRaw = value;
          const parsed = parseLankaPayMerchant(value);
          merchantAccountParsed = parsed.ok ? parsed.merchant : null;
        } else {
          reservedFields[tag] = value;
        }
        break;
      case TAG_MCC:
        merchantCategoryCode = value;
        break;
      case TAG_TRANSACTION_CURRENCY:
        transactionCurrency = value;
        break;
      case TAG_TRANSACTION_AMOUNT:
        transactionAmount = value;
        break;
      case TAG_TIP_INDICATOR:
        tip55 = value;
        break;
      case TAG_CONVENIENCE_FEE_FIXED:
        tipFixed = value;
        break;
      case TAG_CONVENIENCE_FEE_PERCENTAGE:
        tipPercentage = value;
        break;
      case TAG_COUNTRY_CODE:
        countryCode = value;
        break;
      case TAG_MERCHANT_NAME:
        merchantName = value;
        break;
      case TAG_MERCHANT_CITY:
        merchantCity = value;
        break;
      case TAG_POSTAL_CODE:
        postalCode = value;
        break;
      case TAG_ADDITIONAL_DATA:
        for (const sub of parseTLV(value)) {
          if (sub.tag === SUBTAG_REFERENCE_LABEL) referenceLabel = sub.value;
          else reservedFields[`${TAG_ADDITIONAL_DATA}.${sub.tag}`] = sub.value;
        }
        break;
      case TAG_CRC:
        crc = value;
        break;
      case TAG_ALTERNATE_LANGUAGE: {
        let languageCode = "";
        let altName = "";
        let altCity: string | undefined;
        for (const sub of parseTLV(value)) {
          if (sub.tag === SUBTAG_LANGUAGE_PREFERENCE) languageCode = sub.value;
          else if (sub.tag === SUBTAG_ALTERNATE_MERCHANT_NAME) altName = sub.value;
          else if (sub.tag === SUBTAG_ALTERNATE_MERCHANT_CITY) altCity = sub.value;
          else reservedFields[`${TAG_ALTERNATE_LANGUAGE}.${sub.tag}`] = sub.value;
        }
        alternateLanguage =
          altCity === undefined
            ? { languageCode, merchantName: altName }
            : { languageCode, merchantName: altName, merchantCity: altCity };
        break;
      }
      default:
        reservedFields[tag] = value;
        break;
    }
  }

  if (rawTags[TAG_PAYLOAD_FORMAT_INDICATOR] !== PAYLOAD_FORMAT_INDICATOR) {
    return { ok: false, reason: "missing payload format indicator" };
  }

  const poi = rawTags[TAG_POINT_OF_INITIATION];
  if (poi !== POI_STATIC && poi !== POI_DYNAMIC) {
    return { ok: false, reason: "invalid point of initiation" };
  }

  let tipIndicator: TipIndicator | null = null;
  if (tip55 === TIP_INDICATOR_PROMPT) tipIndicator = { type: "prompt" };
  else if (tip55 === TIP_INDICATOR_FIXED) tipIndicator = { type: "fixed", amount: tipFixed };
  else if (tip55 === TIP_INDICATOR_PERCENTAGE) {
    tipIndicator = { type: "percentage", value: tipPercentage };
  }

  return {
    ok: true,
    data: {
      payloadFormatIndicator: PAYLOAD_FORMAT_INDICATOR,
      pointOfInitiation: poi === POI_STATIC ? "static" : "dynamic",
      merchantAccount: { raw: merchantAccountRaw, parsed: merchantAccountParsed },
      merchantAccountTag,
      merchantCategoryCode,
      countryCode,
      transactionCurrency,
      transactionAmount,
      merchantName,
      merchantCity,
      postalCode,
      referenceLabel,
      tipIndicator,
      alternateLanguage,
      crc,
      rawTags,
      reservedFields,
    },
  };
}
