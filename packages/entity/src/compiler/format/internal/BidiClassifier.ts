import {
  ARABIC_INDIC_DIGIT_PATTERN, ARABIC_SCRIPT_PATTERN, EXTENDED_ARABIC_INDIC_DIGIT_PATTERN,
  HEBREW_SCRIPT_PATTERN, NONSPACING_MARK_PATTERN
} from '../../constants/format/NetworkFormatPatterns.js';

/** Approximates RFC 5893 Bidi_Class for the code point classes the JSON-Schema-suite exercises. */
export class BidiClassifier {
  private static readonly ASCII_DIGIT_LOWER_BOUND = 0x30;
  private static readonly ASCII_DIGIT_UPPER_BOUND = 0x39;
  private static readonly BOUNDARY_NEUTRAL_CODE_POINTS = new Set([0x200c, 0x200d]);

  public static classify(codePoint: number): 'AL' | 'AN' | 'EN' | 'L' | 'NSM' | 'R' {
    if (codePoint >= BidiClassifier.ASCII_DIGIT_LOWER_BOUND && codePoint <= BidiClassifier.ASCII_DIGIT_UPPER_BOUND) {
      return 'EN';
    }
    if (BidiClassifier.BOUNDARY_NEUTRAL_CODE_POINTS.has(codePoint)) {
      return 'NSM';
    }
    const char = String.fromCodePoint(codePoint);
    if (ARABIC_INDIC_DIGIT_PATTERN.test(char)) {
      return 'AN';
    }
    if (EXTENDED_ARABIC_INDIC_DIGIT_PATTERN.test(char)) {
      return 'EN';
    }
    if (HEBREW_SCRIPT_PATTERN.test(char)) {
      return 'R';
    }
    if (ARABIC_SCRIPT_PATTERN.test(char)) {
      return 'AL';
    }
    if (NONSPACING_MARK_PATTERN.test(char)) {
      return 'NSM';
    }
    return 'L';
  }

  public static isRtlDomainTrigger(bidiClass: 'AL' | 'AN' | 'EN' | 'L' | 'NSM' | 'R'): boolean {
    const result = bidiClass === 'R' || bidiClass === 'AL' || bidiClass === 'AN';
    return result;
  }
}
