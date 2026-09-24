import { JSON_POINTER_TOKEN_SEQUENCE_PATTERN } from '../constants/format/IdentifierFormatPatterns.js';

/** RFC 6901: a sequence of `/`-prefixed reference tokens; `~` must be escaped as `~0` or `~1`. */
export class JsonPointerFormatValidator {
  public static test(value: string): boolean {
    const match = JSON_POINTER_TOKEN_SEQUENCE_PATTERN.exec(value);
    const result = match !== null;
    return result;
  }
}
