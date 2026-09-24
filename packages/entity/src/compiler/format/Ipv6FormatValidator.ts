import {
  DOUBLE_COLON_PATTERN, IPV4_STRICT_PATTERN, IPV6_ALLOWED_CHARS_PATTERN, IPV6_HEX_GROUP_PATTERN
} from '../constants/format/NetworkFormatPatterns.js';

/**
 * RFC 4291 IPv6 literal. Rejects brackets, zone/scope identifiers, and netmasks —
 * those are URI/URL host-literal or CIDR concerns, not part of the address itself.
 */
export class Ipv6FormatValidator {
  private static readonly GROUP_COUNT_LIMIT = 8;
  private static readonly EMBEDDED_IPV4_GROUP_WEIGHT = 2;
  private static readonly HEX_GROUP_COUNT_WITH_EMBEDDED_IPV4 = 6;

  public static test(value: string): boolean {
    if (value.length === 0 || !IPV6_ALLOWED_CHARS_PATTERN.test(value)) {
      return false;
    }
    const doubleColonCount = Ipv6FormatValidator.countDoubleColons(value);
    if (doubleColonCount > 1) {
      return false;
    }
    const result = doubleColonCount === 1 ? Ipv6FormatValidator.testCompressed(value) : Ipv6FormatValidator.testFull(value);
    return result;
  }

  private static countDoubleColons(value: string): number {
    DOUBLE_COLON_PATTERN.lastIndex = 0;
    let count = 0;
    while (DOUBLE_COLON_PATTERN.exec(value) !== null) {
      count += 1;
    }
    return count;
  }

  private static testFull(value: string): boolean {
    const groups = value.split(':');
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.includes('.') === true) {
      const hexGroups = groups.slice(0, -1);
      const result = hexGroups.length === Ipv6FormatValidator.HEX_GROUP_COUNT_WITH_EMBEDDED_IPV4
        && IPV4_STRICT_PATTERN.test(lastGroup) && Ipv6FormatValidator.areHexGroups(hexGroups);
      return result;
    }
    const result = groups.length === Ipv6FormatValidator.GROUP_COUNT_LIMIT && Ipv6FormatValidator.areHexGroups(groups);
    return result;
  }

  private static testCompressed(value: string): boolean {
    const splitIndex = value.indexOf('::');
    const leftPart = value.slice(0, splitIndex);
    const rightPart = value.slice(splitIndex + 2);
    const leftGroups = leftPart === '' ? [] : leftPart.split(':');
    const rightGroups = rightPart === '' ? [] : rightPart.split(':');
    if (leftGroups.includes('') || rightGroups.includes('')) {
      return false;
    }
    const embeddedResult = Ipv6FormatValidator.consumeEmbeddedIpv4(rightGroups);
    if (embeddedResult === undefined) {
      return false;
    }
    const totalGroupCount = leftGroups.length + rightGroups.length + embeddedResult;
    const result = totalGroupCount < Ipv6FormatValidator.GROUP_COUNT_LIMIT
      && Ipv6FormatValidator.areHexGroups(leftGroups)
      && Ipv6FormatValidator.areHexGroups(rightGroups);
    return result;
  }

  /** Pops a trailing embedded IPv4 literal from `rightGroups` if present. Returns its group weight, or `undefined` if invalid. */
  private static consumeEmbeddedIpv4(rightGroups: string[]): number | undefined {
    if (rightGroups.length === 0) {
      return 0;
    }
    const lastGroup = rightGroups[rightGroups.length - 1];
    if (lastGroup?.includes('.') !== true) {
      return 0;
    }
    if (!IPV4_STRICT_PATTERN.test(lastGroup)) {
      return undefined;
    }
    rightGroups.pop();
    return Ipv6FormatValidator.EMBEDDED_IPV4_GROUP_WEIGHT;
  }

  private static areHexGroups(groups: readonly string[]): boolean {
    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index];
      if (group === undefined || !IPV6_HEX_GROUP_PATTERN.test(group)) {
        return false;
      }
    }
    return true;
  }
}
