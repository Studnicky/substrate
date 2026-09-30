import { PunycodeCodec } from './PunycodeCodec.js';

/** Decodes and canonicalizes an `xn--`-prefixed A-label's Punycode payload to Unicode scalar values. */
export class AceLabelDecoder {
  private static readonly ACE_PREFIX_LENGTH = 4;
  private static readonly ASCII_CODE_POINT_LIMIT = 128;
  private static readonly MAXIMUM_CODE_POINT = 0x10_FF_FF;

  public static decode(aceLabel: string): number[] | undefined {
    const payload = aceLabel.slice(AceLabelDecoder.ACE_PREFIX_LENGTH);
    const decoded = PunycodeCodec.decode(payload);
    if (decoded === undefined || AceLabelDecoder.isAsciiOnly(decoded) || !AceLabelDecoder.isWithinUnicodeRange(decoded)) {
      return undefined;
    }
    const reencoded = PunycodeCodec.encode(decoded);
    const result = reencoded.toLowerCase() === payload.toLowerCase() ? decoded : undefined;
    return result;
  }

  /** A decoded value above U+10FFFF is not a Unicode scalar value; it must never reach `String.fromCodePoint`. */
  private static isWithinUnicodeRange(codePoints: readonly number[]): boolean {
    const result = codePoints.every((codePoint) => {
      const within = codePoint <= AceLabelDecoder.MAXIMUM_CODE_POINT;
      return within;
    });
    return result;
  }

  private static isAsciiOnly(codePoints: readonly number[]): boolean {
    for (let index = 0; index < codePoints.length; index += 1) {
      if (codePoints[index]! >= AceLabelDecoder.ASCII_CODE_POINT_LIMIT) {
        return false;
      }
    }
    return true;
  }
}
