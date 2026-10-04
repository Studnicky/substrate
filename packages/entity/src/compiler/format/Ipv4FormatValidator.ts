import { IPV4_OCTET_PATTERN } from '../constants/format/NetworkFormatPatterns.js';

const OCTET_COUNT = 4;

/** RFC 2673 dotted-quad IPv4 literal: four decimal octets 0-255, no leading zeros, no other notation. */
export class Ipv4FormatValidator {
  public static test(value: string): boolean {
    const octets = value.split('.');
    if (octets.length !== OCTET_COUNT) {
      return false;
    }
    for (let index = 0; index < octets.length; index += 1) {
      if (!IPV4_OCTET_PATTERN.test(octets[index]!)) {
        return false;
      }
    }
    return true;
  }
}
