const DIGITS_2 = /^\d{2}$/;

export type TLVNode = {
  tag: string;
  value: string;
};

/**
 * Parses a flat EMVCo TLV string into an array of nodes.
 * Does not recursively descend into nested tags — that is the caller's job.
 * Returns an empty array for empty input.
 * Throws on malformed input (truncated header, non-numeric tag/length, or
 * a declared length that exceeds the remaining input).
 */
export function parseTLV(input: string): TLVNode[] {
  const nodes: TLVNode[] = [];
  let pos = 0;

  while (pos < input.length) {
    if (pos + 4 > input.length) {
      throw new Error(`truncated header at position ${pos}: fewer than 4 characters remain`);
    }

    const tag = input.slice(pos, pos + 2);
    const lenStr = input.slice(pos + 2, pos + 4);

    if (!DIGITS_2.test(tag)) {
      throw new Error(`invalid tag "${tag}" at position ${pos}: expected 2 ASCII digits`);
    }

    if (!DIGITS_2.test(lenStr)) {
      throw new Error(`invalid length "${lenStr}" at position ${pos + 2}: expected 2 ASCII digits`);
    }

    const len = parseInt(lenStr, 10);

    if (pos + 4 + len > input.length) {
      throw new Error(
        `declared length ${len} at position ${pos + 2} exceeds remaining input (${input.length - pos - 4} chars available)`,
      );
    }

    nodes.push({ tag, value: input.slice(pos + 4, pos + 4 + len) });
    pos += 4 + len;
  }

  return nodes;
}

/**
 * Serialises an array of TLV nodes into a string.
 * Each node is encoded as `TT LL VVV…` where LL is value.length padded to 2
 * decimal digits.
 * Throws on an invalid tag or a value longer than 99 characters.
 */
export function serializeTLV(nodes: readonly TLVNode[]): string {
  let result = "";
  for (const { tag, value } of nodes) {
    if (!DIGITS_2.test(tag)) {
      throw new Error(`invalid tag "${tag}": expected 2 ASCII digits`);
    }
    if (value.length > 99) {
      throw new Error(`value too long for tag "${tag}": ${value.length} chars (max 99)`);
    }
    result += `${tag}${value.length.toString().padStart(2, "0")}${value}`;
  }
  return result;
}
