import {
  ASCII_ATEXT_PATTERN, ASCII_DOMAIN_LABEL_PATTERN, ASCII_QTEXT_PATTERN, BACKSLASH_CHARACTER, DOMAIN_MAXIMUM_OCTETS,
  IPV6_LITERAL_TAG_PATTERN, LOCAL_PART_MAXIMUM_OCTETS, QUOTE_CHARACTER, QUOTED_PAIR_CHAR_PATTERN,
  UNICODE_ATEXT_PATTERN, UNICODE_DOMAIN_LABEL_PATTERN, UNICODE_QTEXT_PATTERN
} from '../constants/format/EmailFormatPatterns.js';
import { IPV4_PATTERN, IPV6_PATTERN } from '../constants/FormatPatterns.js';

interface AddressPartsInterface {
  readonly 'domainPart': string;
  readonly 'localPart': string;
}

/** RFC 5321/6531 addr-spec grammar shared by the `email` and `idn-email` format validators. */
export class EmailAddressGrammar {
  public static splitAddress(value: string): AddressPartsInterface | undefined {
    if (value.length === 0) {
      return undefined;
    }
    const separatorIndex = value.charAt(0) === QUOTE_CHARACTER
      ? EmailAddressGrammar.findQuotedLocalEnd(value)
      : value.indexOf('@') - 1;
    if (separatorIndex < 0 || value.charAt(separatorIndex + 1) !== '@') {
      return undefined;
    }
    const localPart = value.slice(0, separatorIndex + 1);
    const domainPart = value.slice(separatorIndex + 2);
    if (localPart.length === 0 || domainPart.length === 0) {
      return undefined;
    }
    const result = { 'domainPart': domainPart, 'localPart': localPart };
    return result;
  }

  public static isValidLocalPart(localPart: string, allowUnicode: boolean): boolean {
    if (new TextEncoder().encode(localPart).length > LOCAL_PART_MAXIMUM_OCTETS) {
      return false;
    }
    if (localPart.charAt(0) === QUOTE_CHARACTER) {
      const result = EmailAddressGrammar.isValidQuotedLocal(localPart, allowUnicode);
      return result;
    }
    const result = EmailAddressGrammar.isValidDotString(localPart, allowUnicode);
    return result;
  }

  public static isValidDomain(domainPart: string, allowUnicode: boolean): boolean {
    if (EmailAddressGrammar.isAddressLiteral(domainPart)) {
      const result = EmailAddressGrammar.isValidAddressLiteral(domainPart);
      return result;
    }
    if (new TextEncoder().encode(domainPart).length > DOMAIN_MAXIMUM_OCTETS) {
      return false;
    }
    const pattern = allowUnicode ? UNICODE_DOMAIN_LABEL_PATTERN : ASCII_DOMAIN_LABEL_PATTERN;
    const labels = domainPart.split('.');
    for (let index = 0; index < labels.length; index += 1) {
      if (!pattern.test(labels[index]!)) {
        return false;
      }
    }
    return true;
  }

  private static findQuotedLocalEnd(value: string): number {
    const length = value.length;
    let index = 1;
    while (index < length) {
      const ch = value.charAt(index);
      if (ch === QUOTE_CHARACTER) {
        return index;
      }
      if (ch === BACKSLASH_CHARACTER) {
        if (index + 1 >= length) {
          const result = -1;
          return result;
        }
        index += 2;
        continue;
      }
      index += 1;
    }
    const result = -1;
    return result;
  }

  private static isValidDotString(localPart: string, allowUnicode: boolean): boolean {
    const pattern = allowUnicode ? UNICODE_ATEXT_PATTERN : ASCII_ATEXT_PATTERN;
    const atoms = localPart.split('.');
    for (let index = 0; index < atoms.length; index += 1) {
      if (!pattern.test(atoms[index]!)) {
        return false;
      }
    }
    return true;
  }

  private static isValidQuotedLocal(localPart: string, allowUnicode: boolean): boolean {
    const qtextPattern = allowUnicode ? UNICODE_QTEXT_PATTERN : ASCII_QTEXT_PATTERN;
    const length = localPart.length;
    let index = 1;
    while (index < length - 1) {
      const ch = localPart.charAt(index);
      if (ch === BACKSLASH_CHARACTER) {
        if (!QUOTED_PAIR_CHAR_PATTERN.test(localPart.charAt(index + 1))) {
          return false;
        }
        index += 2;
        continue;
      }
      if (!qtextPattern.test(ch)) {
        return false;
      }
      index += 1;
    }
    return true;
  }

  private static isAddressLiteral(domainPart: string): boolean {
    const result = domainPart.length >= 2 && domainPart.charAt(0) === '[' && domainPart.charAt(domainPart.length - 1) === ']';
    return result;
  }

  private static isValidAddressLiteral(domainPart: string): boolean {
    const inner = domainPart.slice(1, -1);
    if (IPV4_PATTERN.test(inner)) {
      return true;
    }
    if (IPV6_LITERAL_TAG_PATTERN.test(inner)) {
      const address = inner.slice(inner.indexOf(':') + 1);
      const result = IPV6_PATTERN.test(address);
      return result;
    }
    return false;
  }
}
