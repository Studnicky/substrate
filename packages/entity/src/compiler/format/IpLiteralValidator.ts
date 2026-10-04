import { URI_FORMAT_PATTERNS } from '../constants/format/UriFormatPatterns.js';

/** Strict RFC 3986 `IP-literal` validation for the bracketed authority host, shared by every URI/IRI format validator. */
export class IpLiteralValidator {
  /** `host` is the matched authority-host capture, bracketed for an IP-literal or bare for a reg-name. */
  public static testHost(host: string | undefined): boolean {
    const isBracketed = host?.startsWith('[') === true;
    if (!isBracketed) {
      return true;
    }
    const content = host.slice(1, -1);
    const result = IpLiteralValidator.testLiteral(content);
    return result;
  }

  private static testLiteral(content: string): boolean {
    if (URI_FORMAT_PATTERNS.ipFuturePattern.test(content)) {
      return true;
    }
    const result = IpLiteralValidator.testIpv6(content);
    return result;
  }

  private static testIpv6(address: string): boolean {
    const segments = address.split('::');
    if (segments.length > 2) {
      return false;
    }
    if (segments.length === 2) {
      const result = IpLiteralValidator.testCompressed(segments[0]!, segments[1]!);
      return result;
    }
    if (address.startsWith(':') || address.endsWith(':')) {
      return false;
    }
    const groups = address.split(':');
    const total = IpLiteralValidator.expandGroups(groups, true);
    const result = total === 8;
    return result;
  }

  private static testCompressed(leftRaw: string, rightRaw: string): boolean {
    const left = leftRaw === '' ? [] : leftRaw.split(':');
    const right = rightRaw === '' ? [] : rightRaw.split(':');
    const leftTotal = IpLiteralValidator.expandGroups(left, false);
    const rightTotal = IpLiteralValidator.expandGroups(right, right.length > 0);
    if (leftTotal === undefined || rightTotal === undefined) {
      return false;
    }
    const result = leftTotal + rightTotal < 8;
    return result;
  }

  /** Sums 16-bit slots for `groups`; the last group may be an embedded IPv4 (worth two slots) only when `allowTrailingIpv4`. */
  private static expandGroups(groups: readonly string[], allowTrailingIpv4: boolean): number | undefined {
    let total = 0;
    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index]!;
      const isLast = index === groups.length - 1;
      if (isLast && allowTrailingIpv4 && group.includes('.')) {
        if (!URI_FORMAT_PATTERNS.ipv4StrictPattern.test(group)) {
          return undefined;
        }
        total += 2;
        continue;
      }
      if (!URI_FORMAT_PATTERNS.h16Pattern.test(group)) {
        return undefined;
      }
      total += 1;
    }
    return total;
  }
}
