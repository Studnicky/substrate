import { UUID_IDENTIFIER_PATTERN } from '../constants/format/IdentifierFormatPatterns.js';

/** RFC 4122 canonical 8-4-4-4-12 hex form. Version/variant nibbles are not constrained. */
export class UuidFormatValidator {
  public static test(value: string): boolean {
    const match = UUID_IDENTIFIER_PATTERN.exec(value);
    const result = match !== null;
    return result;
  }
}
