import { EmailAddressGrammar } from './EmailAddressGrammar.js';

/** Validates the JSON Schema `email` format: RFC 5321 addr-spec, ASCII only. */
export class EmailFormatValidator {
  public static test(value: string): boolean {
    const parts = EmailAddressGrammar.splitAddress(value);
    if (parts === undefined) {
      return false;
    }
    if (!EmailAddressGrammar.isValidLocalPart(parts.localPart, false)) {
      return false;
    }
    const result = EmailAddressGrammar.isValidDomain(parts.domainPart, false);
    return result;
  }
}
