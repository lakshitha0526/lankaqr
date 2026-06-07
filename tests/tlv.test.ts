import { describe, expect, it } from "vitest";
import { parseTLV, serializeTLV, type TLVNode } from "../src/index";

// Canonical EMVCo MPM test vector from SPEC.md Appendix B
const EMVCO_FULL =
  "00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING64200002ZH0104最佳运输0202北京540523.7253031565502016233030412340603***0708A60086670902ME91320016A0112233449988770708123456786304A13A";

describe("parseTLV", () => {
  it("(a) returns empty array for empty string", () => {
    expect(parseTLV("")).toEqual([]);
  });

  it("(b) parses a single TLV node correctly", () => {
    expect(parseTLV("000201")).toEqual([{ tag: "00", value: "01" }]);
  });

  it("(c) parses multiple flat TLVs in input order", () => {
    expect(parseTLV("000201010212")).toEqual([
      { tag: "00", value: "01" },
      { tag: "01", value: "12" },
    ]);
  });

  it("(d) parses the canonical EMVCo payload to the expected top-level tags in order", () => {
    const nodes = parseTLV(EMVCO_FULL);
    // Actual in-string order — mechanically verified against SPEC.md Appendix B.
    // 15 tags; tag 55 (Tip Indicator) is present; tags are not in numeric order.
    expect(nodes.map((n) => n.tag)).toEqual([
      "00",
      "01",
      "29",
      "31",
      "52",
      "58",
      "59",
      "60",
      "64",
      "54",
      "53",
      "55",
      "62",
      "91",
      "63",
    ]);
  });

  it("(e) handles BMP CJK characters: JS string length counts each as 1", () => {
    // "最佳运输" is 4 BMP code points → .length === 4, so LL is "04"
    expect(parseTLV("0104最佳运输")).toEqual([{ tag: "01", value: "最佳运输" }]);
  });

  it("(f) throws on truncated input (both flavours)", () => {
    // Declared length exceeds remaining characters
    expect(() => parseTLV("0099AB")).toThrow(/declared length/);
    // Fewer than 4 chars remain for the next header after a valid first node
    expect(() => parseTLV("000201ABC")).toThrow(/truncated header/);
  });

  it("(g) throws on non-numeric tag", () => {
    expect(() => parseTLV("XY0201")).toThrow(/invalid tag/);
  });

  it("(h) throws on non-numeric length", () => {
    expect(() => parseTLV("00XY01")).toThrow(/invalid length/);
  });
});

describe("serializeTLV", () => {
  it("(i) returns empty string for empty array", () => {
    expect(serializeTLV([])).toBe("");
  });

  it("(j) computes the length field from value.length with leading-zero padding", () => {
    expect(serializeTLV([{ tag: "00", value: "hello" }])).toBe("0005hello");
    expect(serializeTLV([{ tag: "63", value: "A13A" }])).toBe("6304A13A");
  });

  it("(k) throws when tag does not match /^\\d{2}$/", () => {
    expect(() => serializeTLV([{ tag: "XY", value: "test" }])).toThrow(/invalid tag/);
  });

  it("(l) throws when value.length exceeds 99", () => {
    expect(() => serializeTLV([{ tag: "00", value: "x".repeat(100) }])).toThrow(/value too long/);
  });
});

describe("round-trip", () => {
  it("(m) parseTLV(serializeTLV(nodes)) deep-equals the original nodes", () => {
    const nodes: TLVNode[] = [
      { tag: "00", value: "hello" },
      { tag: "01", value: "world" },
    ];
    expect(parseTLV(serializeTLV(nodes))).toEqual(nodes);
  });

  it("(n) serializeTLV(parseTLV(payload)) equals the original payload", () => {
    const payload = "000201010212";
    expect(serializeTLV(parseTLV(payload))).toBe(payload);
  });
});

describe("nested parse (manual recursion)", () => {
  it("(o) parsing the outer node then its value gives the expected inner nodes", () => {
    // Outer: tag 64 wrapping "0002ZH0103XYZ" (13 chars, so LL = "13")
    const inner = "0002ZH0103XYZ";
    const outer = `64${inner.length.toString().padStart(2, "0")}${inner}`;

    const outerNodes = parseTLV(outer);
    expect(outerNodes).toEqual([{ tag: "64", value: inner }]);

    // Recursively parse the inner value — use ?. with fallback to keep biome happy
    const innerNodes = parseTLV(outerNodes[0]?.value ?? "");
    expect(innerNodes).toEqual([
      { tag: "00", value: "ZH" },
      { tag: "01", value: "XYZ" },
    ]);
  });
});
