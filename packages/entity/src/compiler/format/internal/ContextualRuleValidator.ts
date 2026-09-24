import {
  ARABIC_INDIC_DIGIT_PATTERN, ARABIC_SCRIPT_PATTERN, EXTENDED_ARABIC_INDIC_DIGIT_PATTERN,
  GREEK_SCRIPT_PATTERN, HEBREW_SCRIPT_PATTERN, IDNA_ALLOWED_GENERAL_CATEGORY_PATTERN,
  KATAKANA_HIRAGANA_HAN_PATTERN, LEADING_COMBINING_MARK_PATTERN, VIRAMA_PATTERN
} from '../../constants/format/NetworkFormatPatterns.js';

/** RFC 5892 Appendix A ContextJ/ContextO rules, the ACE-prefix hyphen rule, and digit-mixing rule — per label. */
export class ContextualRuleValidator {
  private static readonly HYPHEN = 0x002d;
  private static readonly LOWERCASE_L = 0x006c;
  private static readonly ACE_PREFIX_X = 0x0078;
  private static readonly ACE_PREFIX_N = 0x006e;
  private static readonly ACE_PREFIX_LENGTH = 4;
  private static readonly HYPHEN_POSITION_INDEX = 2;
  private static readonly ALWAYS_DISALLOWED = new Set([0x0640, 0x07fa, 0x302e, 0x302f, 0x303b]);
  private static readonly ALWAYS_PVALID = new Set([0x00df, 0x03c2, 0x06fd, 0x06fe, 0x0f0b, 0x3007]);
  private static readonly CONTEXT_DEPENDENT_CODE_POINTS = new Set([0x00b7, 0x0375, 0x05f3, 0x05f4, 0x200c, 0x200d, 0x30fb]);
  private static readonly CONTEXT_DEPENDENT_CHECKERS = new Map<number, (codePoints: readonly number[], index: number) => boolean>([
    [0x00b7, (codePoints, index) => { const result = ContextualRuleValidator.isMiddleDotValid(codePoints, index); return result; }],
    [0x0375, (codePoints, index) => { const result = ContextualRuleValidator.isGreekKeraiaValid(codePoints, index); return result; }],
    [0x05f3, (codePoints, index) => { const result = ContextualRuleValidator.isHebrewCombiningMarkValid(codePoints, index); return result; }],
    [0x05f4, (codePoints, index) => { const result = ContextualRuleValidator.isHebrewCombiningMarkValid(codePoints, index); return result; }],
    [0x200c, (codePoints, index) => { const result = ContextualRuleValidator.isZeroWidthNonJoinerValid(codePoints, index); return result; }],
    [0x200d, (codePoints, index) => { const result = ContextualRuleValidator.isZeroWidthJoinerValid(codePoints, index); return result; }],
    [0x30fb, (codePoints, index) => { const result = ContextualRuleValidator.isKatakanaMiddleDotValid(codePoints, index); return result; }]
  ]);

  public static isLabelValid(codePoints: readonly number[]): boolean {
    if (!ContextualRuleValidator.isHyphenPositionValid(codePoints)) {
      return false;
    }
    if (ContextualRuleValidator.mixesArabicIndicDigits(codePoints)) {
      return false;
    }
    if (codePoints.length > 0 && LEADING_COMBINING_MARK_PATTERN.test(String.fromCodePoint(codePoints[0]!))) {
      return false;
    }
    for (let index = 0; index < codePoints.length; index += 1) {
      if (!ContextualRuleValidator.isCodePointValid(codePoints, index, codePoints[index]!)) {
        return false;
      }
    }
    return true;
  }

  private static isCodePointValid(codePoints: readonly number[], index: number, codePoint: number): boolean {
    if (ContextualRuleValidator.ALWAYS_DISALLOWED.has(codePoint)) {
      return false;
    }
    if (ContextualRuleValidator.ALWAYS_PVALID.has(codePoint)) {
      return true;
    }
    if (!ContextualRuleValidator.CONTEXT_DEPENDENT_CODE_POINTS.has(codePoint)) {
      const result = IDNA_ALLOWED_GENERAL_CATEGORY_PATTERN.test(String.fromCodePoint(codePoint)) || codePoint === ContextualRuleValidator.HYPHEN;
      return result;
    }
    const checker = ContextualRuleValidator.CONTEXT_DEPENDENT_CHECKERS.get(codePoint);
    const result = checker === undefined || checker(codePoints, index);
    return result;
  }

  private static isHyphenPositionValid(codePoints: readonly number[]): boolean {
    if (codePoints.length < ContextualRuleValidator.ACE_PREFIX_LENGTH) {
      return true;
    }
    const isAcePrefix = codePoints[0] === ContextualRuleValidator.ACE_PREFIX_X && codePoints[1] === ContextualRuleValidator.ACE_PREFIX_N
      && codePoints[2] === ContextualRuleValidator.HYPHEN && codePoints[3] === ContextualRuleValidator.HYPHEN;
    const hasHyphenPair = codePoints[ContextualRuleValidator.HYPHEN_POSITION_INDEX] === ContextualRuleValidator.HYPHEN
      && codePoints[ContextualRuleValidator.HYPHEN_POSITION_INDEX + 1] === ContextualRuleValidator.HYPHEN;
    const result = isAcePrefix || !hasHyphenPair;
    return result;
  }

  private static mixesArabicIndicDigits(codePoints: readonly number[]): boolean {
    let sawArabicIndic = false;
    let sawExtendedArabicIndic = false;
    for (let index = 0; index < codePoints.length; index += 1) {
      const char = String.fromCodePoint(codePoints[index]!);
      sawArabicIndic = sawArabicIndic || ARABIC_INDIC_DIGIT_PATTERN.test(char);
      sawExtendedArabicIndic = sawExtendedArabicIndic || EXTENDED_ARABIC_INDIC_DIGIT_PATTERN.test(char);
    }
    const result = sawArabicIndic && sawExtendedArabicIndic;
    return result;
  }

  private static isMiddleDotValid(codePoints: readonly number[], index: number): boolean {
    const result = codePoints[index - 1] === ContextualRuleValidator.LOWERCASE_L && codePoints[index + 1] === ContextualRuleValidator.LOWERCASE_L;
    return result;
  }

  private static isGreekKeraiaValid(codePoints: readonly number[], index: number): boolean {
    const nextCodePoint = codePoints[index + 1];
    const result = nextCodePoint !== undefined && GREEK_SCRIPT_PATTERN.test(String.fromCodePoint(nextCodePoint));
    return result;
  }

  private static isHebrewCombiningMarkValid(codePoints: readonly number[], index: number): boolean {
    const previousCodePoint = codePoints[index - 1];
    const result = previousCodePoint !== undefined && HEBREW_SCRIPT_PATTERN.test(String.fromCodePoint(previousCodePoint));
    return result;
  }

  private static isKatakanaMiddleDotValid(codePoints: readonly number[], _index: number): boolean {
    for (let index = 0; index < codePoints.length; index += 1) {
      if (KATAKANA_HIRAGANA_HAN_PATTERN.test(String.fromCodePoint(codePoints[index]!))) {
        return true;
      }
    }
    return false;
  }

  private static isZeroWidthNonJoinerValid(codePoints: readonly number[], index: number): boolean {
    const previousCodePoint = codePoints[index - 1];
    if (previousCodePoint !== undefined && VIRAMA_PATTERN.test(String.fromCodePoint(previousCodePoint))) {
      return true;
    }
    const nextCodePoint = codePoints[index + 1];
    const result = previousCodePoint !== undefined && nextCodePoint !== undefined
      && ARABIC_SCRIPT_PATTERN.test(String.fromCodePoint(previousCodePoint))
      && ARABIC_SCRIPT_PATTERN.test(String.fromCodePoint(nextCodePoint));
    return result;
  }

  private static isZeroWidthJoinerValid(codePoints: readonly number[], index: number): boolean {
    const previousCodePoint = codePoints[index - 1];
    const result = previousCodePoint !== undefined && VIRAMA_PATTERN.test(String.fromCodePoint(previousCodePoint));
    return result;
  }
}
