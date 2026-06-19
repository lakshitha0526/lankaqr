import { decode } from "./decode";
import { COUNTRY_CODE_LK, CURRENCY_LKR } from "./tags";

/**
 * Returns true only when `payload` is both EMVCo well-formed AND
 * LankaQR-conformant (SPEC §8 level 2).
 *
 * Conformance is layered on top of `decode()`: a successful decode already
 * guarantees a valid CRC, a well-formed TLV with tag 63 last, payload format
 * indicator `"01"`, and a point of initiation of `"11"`/`"12"` (checks 6 and 7).
 * On top of that this requires the four LankaQR-specific rules: country `LK`,
 * currency `144`, at least one of tag 26/27 present (both is acceptable per
 * locked decision 3), and a non-empty reference label (tag 62 sub-05).
 *
 * Boolean only — callers needing a structured reason should use `decode()`.
 */
export function isValid(payload: string): boolean {
  const result = decode(payload);
  if (!result.ok) return false;

  const { countryCode, transactionCurrency, merchantAccountTag, referenceLabel } = result.data;
  return (
    countryCode === COUNTRY_CODE_LK &&
    transactionCurrency === CURRENCY_LKR &&
    merchantAccountTag !== null &&
    referenceLabel.length > 0
  );
}
