import { URI_FORMAT_PATTERNS } from '../constants/format/UriFormatPatterns.js';
import { IpLiteralValidator } from './IpLiteralValidator.js';

/** JSON Schema `uri-reference` format: an absolute RFC 3986 URI or a relative-reference. */
export class UriReferenceFormatValidator {
  public static test(value: string): boolean {
    const absoluteMatch = URI_FORMAT_PATTERNS.uriAbsolutePattern.exec(value);
    if (absoluteMatch !== null) {
      const result = IpLiteralValidator.testHost(absoluteMatch.groups?.host);
      return result;
    }
    const relativeMatch = URI_FORMAT_PATTERNS.uriReferenceRelativePattern.exec(value);
    if (relativeMatch === null) {
      return false;
    }
    const result = IpLiteralValidator.testHost(relativeMatch.groups?.host);
    return result;
  }
}
