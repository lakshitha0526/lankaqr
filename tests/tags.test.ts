import { describe, expect, it } from "vitest";
import { MCC, NESTED_TAGS } from "../src/tags";

describe("MCC", () => {
  it("(a) contains the four CBSL-mandated MCC values from SPEC §7.8", () => {
    expect(MCC.FUEL).toBe("5542");
    expect(MCC.GOVERNMENT).toBe("9399");
    expect(MCC.RELIGIOUS).toBe("8661");
    expect(MCC.P2P).toBe("4829");
  });
});

describe("NESTED_TAGS", () => {
  it("(b) contains exactly tags 26, 27, 62, and 64", () => {
    expect(NESTED_TAGS.size).toBe(4);
    expect(NESTED_TAGS.has("26")).toBe(true);
    expect(NESTED_TAGS.has("27")).toBe(true);
    expect(NESTED_TAGS.has("62")).toBe(true);
    expect(NESTED_TAGS.has("64")).toBe(true);
  });
});
