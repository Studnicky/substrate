import {
  DATE_PATTERN, DATE_TIME_PATTERN, DURATION_PATTERN, EMAIL_PATTERN, HOSTNAME_PATTERN,
  IPV4_PATTERN, IPV6_PATTERN, JSON_POINTER_PATTERN, TIME_PATTERN, URI_PATTERN, URI_REFERENCE_PATTERN, UUID_PATTERN
} from './constants/FormatPatterns.js';

interface FormatCheckerInterface {
  (value: string): boolean;
}

/** `Map`-backed `format` dispatch, built once at module load. Unknown formats pass (annotation-only). */
export class FormatValidators {
  private static readonly CHECKERS = new Map<string, FormatCheckerInterface>([
    ['date', (value) => { const result = DATE_PATTERN.test(value); return result; }],
    ['date-time', (value) => { const result = DATE_TIME_PATTERN.test(value); return result; }],
    ['duration', (value) => { const result = DURATION_PATTERN.test(value); return result; }],
    ['email', (value) => { const result = EMAIL_PATTERN.test(value); return result; }],
    ['hostname', (value) => { const result = HOSTNAME_PATTERN.test(value); return result; }],
    ['ipv4', (value) => { const result = IPV4_PATTERN.test(value); return result; }],
    ['ipv6', (value) => { const result = IPV6_PATTERN.test(value); return result; }],
    ['json-pointer', (value) => { const result = JSON_POINTER_PATTERN.test(value); return result; }],
    ['regex', FormatValidators.isValidRegex],
    ['time', (value) => { const result = TIME_PATTERN.test(value); return result; }],
    ['uri', (value) => { const result = URI_PATTERN.test(value); return result; }],
    ['uri-reference', (value) => { const result = URI_REFERENCE_PATTERN.test(value); return result; }],
    ['uuid', (value) => { const result = UUID_PATTERN.test(value); return result; }]
  ]);

  /** Tests `value` against a declared format. An unrecognised format name is not an assertion failure. */
  public static test(format: string, value: string): boolean {
    const checker = FormatValidators.CHECKERS.get(format);
    const result = checker === undefined || checker(value);
    return result;
  }

  private static isValidRegex(value: string): boolean {
    try {
      const probe = new RegExp(value, 'u');
      const result = probe instanceof RegExp;
      return result;
    } catch {
      return false;
    }
  }
}
