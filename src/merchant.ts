import {
  MERCHANT_BANK_CODE_LENGTH,
  MERCHANT_BLOCK_LENGTH,
  MERCHANT_MERCHANT_ID_LENGTH,
  MERCHANT_NETWORK_TYPE_LENGTH,
  MERCHANT_SUB_ACQUIRER_LENGTH,
  MERCHANT_TERMINAL_ID_LENGTH,
} from "./tags";
import type { LankaPayMerchant, MerchantParseResult } from "./types";

const ALPHANUMERIC = /^[A-Za-z0-9]+$/;

function validateField(name: string, value: string, length: number): void {
  if (value.length !== length) {
    const unit = length === 1 ? "character" : "characters";
    throw new Error(`${name} must be exactly ${length} ${unit}`);
  }
  if (!ALPHANUMERIC.test(value)) {
    throw new Error(`${name} must be alphanumeric`);
  }
}

/**
 * Parses a 28-character LankaPay merchant account block into its five fields.
 * Returns `ok: false` for any input that is not exactly 28 characters.
 * Does not validate alphanumeric content — content judgement is left to
 * higher layers.
 */
export function parseLankaPayMerchant(raw: string): MerchantParseResult {
  if (raw.length !== MERCHANT_BLOCK_LENGTH) {
    return { ok: false, reason: "merchant account block must be 28 characters" };
  }
  const p0 = 0;
  const p1 = p0 + MERCHANT_NETWORK_TYPE_LENGTH;
  const p2 = p1 + MERCHANT_BANK_CODE_LENGTH;
  const p3 = p2 + MERCHANT_SUB_ACQUIRER_LENGTH;
  const p4 = p3 + MERCHANT_MERCHANT_ID_LENGTH;
  return {
    ok: true,
    merchant: {
      networkType: raw.slice(p0, p1),
      bankCode: raw.slice(p1, p2),
      subAcquirer: raw.slice(p2, p3),
      merchantId: raw.slice(p3, p4),
      terminalId: raw.slice(p4),
    },
  };
}

/**
 * Serialises a `LankaPayMerchant` into the 28-character wire block.
 * Throws `Error` if any field has the wrong length or contains
 * non-alphanumeric characters — these are programmer errors, not user errors.
 */
export function formatLankaPayMerchant(input: LankaPayMerchant): string {
  validateField("networkType", input.networkType, MERCHANT_NETWORK_TYPE_LENGTH);
  validateField("bankCode", input.bankCode, MERCHANT_BANK_CODE_LENGTH);
  validateField("subAcquirer", input.subAcquirer, MERCHANT_SUB_ACQUIRER_LENGTH);
  validateField("merchantId", input.merchantId, MERCHANT_MERCHANT_ID_LENGTH);
  validateField("terminalId", input.terminalId, MERCHANT_TERMINAL_ID_LENGTH);
  return `${input.networkType}${input.bankCode}${input.subAcquirer}${input.merchantId}${input.terminalId}`;
}
