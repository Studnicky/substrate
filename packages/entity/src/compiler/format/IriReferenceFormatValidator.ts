import { URI_FORMAT_PATTERNS } from '../constants/format/UriFormatPatterns.js';
import { IpLiteralValidator } from './IpLiteralValidator.js';

/** JSON Schema `iri-reference` format: an absolute RFC 3987 IRI or a relative-reference. */
export class IriReferenceFormatValidator {
  public static test(value: string): boolean {
    const absoluteMatch = URI_FORMAT_PATTERNS.iriAbsolutePattern.exec(value);
    if (absoluteMatch !== null) {
      const result = IpLiteralValidator.testHost(absoluteMatch.groups?.host);
      return result;
    }
    const relativeMatch = URI_FORMAT_PATTERNS.iriReferenceRelativePattern.exec(value);
    if (relativeMatch === null) {
      return false;
    }
    const result = IpLiteralValidator.testHost(relativeMatch.groups?.host);
    return result;
  }
}
