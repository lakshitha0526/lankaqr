import { describe, expect, it } from "vitest";
import { computeCRC, verifyCRC } from "../src/index";

// Canonical EMVCo MPM test vector from SPEC.md Appendix B
const EMVCO_FULL =
  "00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING64200002ZH0104最佳运输0202北京540523.7253031565502016233030412340603***0708A60086670902ME91320016A0112233449988770708123456786304A13A";

// Everything up to and including "6304" — what the CRC is computed over
const EMVCO_PREFIX = EMVCO_FULL.slice(0, -4);

describe("computeCRC", () => {
  it('produces "29B1" for the standard "123456789" check vector', () => {
    expect(computeCRC("123456789")).toBe("29B1");
  });

  it('produces "A13A" for the canonical EMVCo MPM prefix from SPEC.md Appendix B', () => {
    expect(computeCRC(EMVCO_PREFIX)).toBe("A13A");
  });

  it("returns uppercase output for inputs whose CRC contains hex digits a-f", () => {
    const result = computeCRC("123456789"); // known to produce "29B1" (contains B)
    expect(result).toBe(result.toUpperCase());
    expect(result).toMatch(/^[0-9A-F]{4}$/);
  });

  it('produces "FFFF" for an empty string (no bytes processed, initial value returned)', () => {
    expect(computeCRC("")).toBe("FFFF");
  });

  it("always returns a 4-character string regardless of input length", () => {
    for (const input of ["", "a", "123456789", "x".repeat(50), EMVCO_PREFIX]) {
      expect(computeCRC(input)).toHaveLength(4);
    }
  });
});

describe("verifyCRC", () => {
  it("returns true for the canonical EMVCo payload", () => {
    expect(verifyCRC(EMVCO_FULL)).toBe(true);
  });

  it('returns true when the CRC suffix is lowercase ("a13a")', () => {
    expect(verifyCRC(`${EMVCO_PREFIX}a13a`)).toBe(true);
  });

  it("returns false when the CRC is tampered", () => {
    expect(verifyCRC(`${EMVCO_PREFIX}0000`)).toBe(false);
  });

  it('returns false when "6304" is missing from the payload', () => {
    expect(verifyCRC("00020101021100")).toBe(false);
  });

  it("returns false when trailing garbage appears after the CRC", () => {
    expect(verifyCRC(`${EMVCO_FULL}XX`)).toBe(false);
  });
});
