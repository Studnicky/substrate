import { URI_FORMAT_PATTERNS } from '../constants/format/UriFormatPatterns.js';

/** JSON Schema `uri-template` format: RFC 6570 template syntax (literals interleaved with `{expression}` blocks). */
export class UriTemplateFormatValidator {
  public static test(value: string): boolean {
    const match = URI_FORMAT_PATTERNS.uriTemplatePattern.exec(value);
    const result = match !== null;
    return result;
  }
}
