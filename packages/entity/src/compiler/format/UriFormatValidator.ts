import { URI_FORMAT_PATTERNS } from '../constants/format/UriFormatPatterns.js';
import { IpLiteralValidator } from './IpLiteralValidator.js';

/** JSON Schema `uri` format: an absolute RFC 3986 URI (scheme required). */
export class UriFormatValidator {
  public static test(value: string): boolean {
    const match = URI_FORMAT_PATTERNS.uriAbsolutePattern.exec(value);
    if (match === null) {
      return false;
    }
    const result = IpLiteralValidator.testHost(match.groups?.host);
    return result;
  }
}
