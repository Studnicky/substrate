import { EmailAddressGrammar } from './EmailAddressGrammar.js';

/** Validates the JSON Schema `idn-email` format: RFC 6531 addr-spec, Unicode local part and domain. */
export class IdnEmailFormatValidator {
  public static test(value: string): boolean {
    const parts = EmailAddressGrammar.splitAddress(value);
    if (parts === undefined) {
      return false;
    }
    if (!EmailAddressGrammar.isValidLocalPart(parts.localPart, true)) {
      return false;
    }
    const result = EmailAddressGrammar.isValidDomain(parts.domainPart, true);
    return result;
  }
}
