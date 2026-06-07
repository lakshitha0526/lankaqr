const POLYNOMIAL = 0x1021;
const INITIAL_VALUE = 0xffff;

function crc16ccittFalse(bytes: Uint8Array): number {
  let crc = INITIAL_VALUE;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ POLYNOMIAL) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

/**
 * Encodes `input` as UTF-8 bytes, computes CRC-16/CCITT-FALSE, and returns
 * the result as 4 uppercase hexadecimal characters.
 */
export function computeCRC(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const crc = crc16ccittFalse(bytes);
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Verifies the CRC of a full LankaQR / EMVCo MPM payload.
 * Locates the last "6304" marker, computes the CRC over the prefix including
 * that marker, and compares case-insensitively against the 4-character suffix.
 */
export function verifyCRC(payload: string): boolean {
  const marker = "6304";
  const markerIdx = payload.lastIndexOf(marker);
  if (markerIdx === -1) return false;
  const crcStart = markerIdx + marker.length;
  const suffix = payload.slice(crcStart);
  if (suffix.length !== 4) return false;
  const covered = payload.slice(0, crcStart);
  const computed = computeCRC(covered);
  return computed.toLowerCase() === suffix.toLowerCase();
}
