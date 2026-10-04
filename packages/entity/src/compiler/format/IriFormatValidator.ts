import { URI_FORMAT_PATTERNS } from '../constants/format/UriFormatPatterns.js';
import { IpLiteralValidator } from './IpLiteralValidator.js';

/** JSON Schema `iri` format: an absolute RFC 3987 IRI (scheme required, Unicode-friendly). */
export class IriFormatValidator {
  public static test(value: string): boolean {
    const match = URI_FORMAT_PATTERNS.iriAbsolutePattern.exec(value);
    if (match === null) {
      return false;
    }
    const result = IpLiteralValidator.testHost(match.groups?.host);
    return result;
  }
}
