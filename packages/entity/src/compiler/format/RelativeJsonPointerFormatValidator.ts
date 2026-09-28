import { RELATIVE_JSON_POINTER_INTEGER_PREFIX_PATTERN } from '../constants/format/IdentifierFormatPatterns.js';
import { JsonPointerFormatValidator } from './JsonPointerFormatValidator.js';

/**
 * Relative JSON Pointer: a non-negative integer prefix (no leading zeros, except `0` itself)
 * followed by either nothing, `#`, or a JSON Pointer — never both `#` and a pointer suffix.
 */
export class RelativeJsonPointerFormatValidator {
  public static test(value: string): boolean {
    const prefixMatch = RELATIVE_JSON_POINTER_INTEGER_PREFIX_PATTERN.exec(value);
    const result = prefixMatch !== null && RelativeJsonPointerFormatValidator.testSuffix(value.slice(prefixMatch[0].length));
    return result;
  }

  private static testSuffix(suffix: string): boolean {
    if (suffix === '' || suffix === '#') {
      return true;
    }
    if (suffix.startsWith('/')) {
      const result = JsonPointerFormatValidator.test(suffix);
      return result;
    }
    return false;
  }
}
