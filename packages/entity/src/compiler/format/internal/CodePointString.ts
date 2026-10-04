import { CodePointError } from '../../../CodePointError.js';

/** Converts a Unicode code point to its string; a value outside the code point range surfaces as `CodePointError`. */
export class CodePointString {
  public static from(codePoint: number): string {
    try {
      const result = String.fromCodePoint(codePoint);
      return result;
    } catch (error) {
      throw new CodePointError(`Value ${String(codePoint)} is not a valid Unicode code point`, error);
    }
  }
}
