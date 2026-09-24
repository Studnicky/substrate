import { PunycodeCodec } from './PunycodeCodec.js';

/** Decodes and canonicalizes an `xn--`-prefixed A-label's Punycode payload to Unicode scalar values. */
export class AceLabelDecoder {
  private static readonly ACE_PREFIX_LENGTH = 4;
  private static readonly ASCII_CODE_POINT_LIMIT = 128;

  public static decode(aceLabel: string): number[] | undefined {
    const payload = aceLabel.slice(AceLabelDecoder.ACE_PREFIX_LENGTH);
    const decoded = PunycodeCodec.decode(payload);
    if (decoded === undefined || AceLabelDecoder.isAsciiOnly(decoded)) {
      return undefined;
    }
    const reencoded = PunycodeCodec.encode(decoded);
    const result = reencoded.toLowerCase() === payload.toLowerCase() ? decoded : undefined;
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
