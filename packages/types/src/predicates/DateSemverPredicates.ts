import {
  ALL_DIGITS_PATTERN,
  DATE_LIKE_TIMESTAMP_RANGE,
  SEMVER_LEADING_V_PATTERN,
  TIME_ONLY_PATTERN
} from './constants/index.js';
import { TypeGuardPredicates } from './TypeGuardPredicates.js';

interface ParsedSemverInterface {
  readonly 'hasExplicitMinor': boolean
  readonly 'major': number
  readonly 'minor': number
  readonly 'patch': number
  readonly 'prerelease': string
}

/** Date-like value detection and semantic-version comparison/range predicates. */
export class DateSemverPredicates extends TypeGuardPredicates {
  /** Longest-prefix-first: `>=`/`<=` must be tested before `>`/`<` or the shorter operator would match part of the longer one. */
  private static readonly semverOperatorPrefixOrder: readonly string[] = ['>=', '<=', '>', '<', '='];

  private static readonly semverComparisonOperators = new Map<string, (order: number) => boolean>([
    ['<', DateSemverPredicates.isOrderLess],
    ['<=', DateSemverPredicates.isOrderLessOrEqual],
    ['=', DateSemverPredicates.isOrderEqual],
    ['>', DateSemverPredicates.isOrderGreater],
    ['>=', DateSemverPredicates.isOrderGreaterOrEqual]
  ]);

  /**
   * Checks whether a value is date-like: a `Date` instance (even an invalid one), a numeric
   * timestamp within 1990-2100, a time-only string (`HH:MM`/`HH:MM:SS`), or a parseable date string.
   */
  public static isDateLike(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (value instanceof Date) {
      return true;
    }

    if (typeof value === 'number') {
      const result = DateSemverPredicates.isDateLikeNumber(value);
      return result;
    }

    if (typeof value === 'string') {
      const result = DateSemverPredicates.isDateLikeString(value);
      return result;
    }

    return false;
  }

  /**
   * Compares two semantic version strings by major, minor, patch, then
   * prerelease (a prerelease version sorts before its release, per semver
   * precedence; two prereleases compare lexicographically). A malformed
   * version sorts after a well-formed one; two malformed versions compare
   * equal.
   */
  public static compareSemverVersions(first: string, second: string): number {
    const parsedFirst = DateSemverPredicates.parseSemverVersion(first);
    const parsedSecond = DateSemverPredicates.parseSemverVersion(second);

    if (parsedFirst === undefined && parsedSecond === undefined) {
      return 0;
    }
    if (parsedFirst === undefined) {
      return 1;
    }
    if (parsedSecond === undefined) {
      const result = -1;
      return result;
    }

    const coreResult = DateSemverPredicates.compareParsedSemver(parsedFirst, parsedSecond);

    if (coreResult !== 0) {
      return coreResult;
    }

    const result = DateSemverPredicates.comparePrereleasePresence(parsedFirst, parsedSecond);
    return result;
  }

  /**
   * Checks whether a semantic version string satisfies a range expression
   * (`*`, `^1.2.3`, `~1.2.3`, `>=`, `<=`, `>`, `<`, `=`, or a bare version for
   * exact match). Malformed version or range input returns `false`.
   */
  public static satisfiesSemverRange(version: string, range: string): boolean {
    const parsed = DateSemverPredicates.parseSemverVersion(version);

    if (parsed === undefined) {
      return false;
    }

    const trimmedRange = range.trim();

    if (trimmedRange === '*') {
      return true;
    }

    if (trimmedRange.startsWith('^')) {
      const result = DateSemverPredicates.satisfiesCaretRange(parsed, trimmedRange.slice(1));
      return result;
    }

    if (trimmedRange.startsWith('~')) {
      const result = DateSemverPredicates.satisfiesTildeRange(parsed, trimmedRange.slice(1));
      return result;
    }

    const result = DateSemverPredicates.satisfiesComparisonRange(parsed, trimmedRange);
    return result;
  }

  /** Compares two dot-separated semver prerelease strings per semver precedence rules: identifiers
   * are compared pairwise, numeric identifiers compare numerically and always precede alphanumeric
   * ones, alphanumeric identifiers compare lexicographically (ASCII), and a prerelease with fewer
   * fields has lower precedence when all preceding fields are equal.
   */
  private static comparePrereleaseIdentifiers(first: string, second: string): number {
    const firstFields = first.split('.');
    const secondFields = second.split('.');
    const fieldCount = Math.max(firstFields.length, secondFields.length);

    for (let index = 0; index < fieldCount; index++) {
      const firstField = firstFields[index];
      const secondField = secondFields[index];

      if (firstField === undefined) {
        const result = -1;
        return result;
      }
      if (secondField === undefined) {
        const result = 1;
        return result;
      }
      if (firstField === secondField) {
        continue;
      }

      const result = DateSemverPredicates.comparePrereleaseField(firstField, secondField);
      return result;
    }

    return 0;
  }

  /** Numeric identifiers compare numerically and always precede alphanumeric ones. */
  private static comparePrereleaseField(firstField: string, secondField: string): number {
    const firstIsNumeric = ALL_DIGITS_PATTERN.test(firstField);
    const secondIsNumeric = ALL_DIGITS_PATTERN.test(secondField);

    if (firstIsNumeric && secondIsNumeric) {
      const result = Number.parseInt(firstField, 10) - Number.parseInt(secondField, 10);
      return result;
    }
    if (firstIsNumeric) {
      const result = -1;
      return result;
    }
    if (secondIsNumeric) {
      const result = 1;
      return result;
    }

    const result = firstField < secondField ? -1 : 1;
    return result;
  }

  /** Compares two parsed semantic versions by major, minor, then patch. */
  private static compareParsedSemver(first: ParsedSemverInterface, second: ParsedSemverInterface): number {
    if (first.major !== second.major) {
      const result = first.major - second.major;
      return result;
    }
    if (first.minor !== second.minor) {
      const result = first.minor - second.minor;
      return result;
    }
    if (first.patch !== second.patch) {
      const result = first.patch - second.patch;
      return result;
    }

    return 0;
  }

  private static comparePrereleasePresence(parsedFirst: ParsedSemverInterface, parsedSecond: ParsedSemverInterface): number {
    if (parsedFirst.prerelease !== '' && parsedSecond.prerelease === '') {
      const result = -1;
      return result;
    }
    if (parsedFirst.prerelease === '' && parsedSecond.prerelease !== '') {
      return 1;
    }
    if (parsedFirst.prerelease !== '' && parsedSecond.prerelease !== '') {
      const result = DateSemverPredicates.comparePrereleaseIdentifiers(parsedFirst.prerelease, parsedSecond.prerelease);
      return result;
    }

    return 0;
  }

  private static isDateLikeNumber(value: number): boolean {
    if (!Number.isFinite(value)) {
      return false;
    }

    const result = value >= DATE_LIKE_TIMESTAMP_RANGE.MINIMUM && value <= DATE_LIKE_TIMESTAMP_RANGE.MAXIMUM;
    return result;
  }

  private static isDateLikeString(value: string): boolean {
    if (value.trim() === '') {
      return false;
    }

    const trimmedValue = value.trim();
    const timeMatch = TIME_ONLY_PATTERN.exec(trimmedValue);

    if (timeMatch !== null) {
      const result = DateSemverPredicates.isValidTimeMatch(timeMatch);
      return result;
    }

    try {
      const parsed = Date.parse(trimmedValue);

      const result = !isNaN(parsed);
      return result;
    } catch {
      return false;
    }
  }

  private static isOrderEqual(order: number): boolean {
    const result = order === 0;
    return result;
  }

  private static isOrderGreater(order: number): boolean {
    const result = order > 0;
    return result;
  }

  private static isOrderGreaterOrEqual(order: number): boolean {
    const result = order >= 0;
    return result;
  }

  private static isOrderLess(order: number): boolean {
    const result = order < 0;
    return result;
  }

  private static isOrderLessOrEqual(order: number): boolean {
    const result = order <= 0;
    return result;
  }

  private static isValidTimeMatch(timeMatch: RegExpExecArray): boolean {
    const hours = parseInt(timeMatch[1] ?? '0', 10);
    const minutes = parseInt(timeMatch[2] ?? '0', 10);
    const seconds = timeMatch[3] === undefined ? 0 : parseInt(timeMatch[3], 10);

    const result = hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59;
    return result;
  }

  /** Finds the longest matching comparison-operator prefix; `>=`/`<=` must precede `>`/`<` to avoid a partial match. */
  private static matchSemverOperatorPrefix(trimmedRange: string): string | undefined {
    const prefixes = DateSemverPredicates.semverOperatorPrefixOrder;
    const prefixCount = prefixes.length;

    for (let index = 0; index < prefixCount; index += 1) {
      const prefix = prefixes[index]!;
      if (trimmedRange.startsWith(prefix)) {
        return prefix;
      }
    }

    return undefined;
  }

  private static parseSemverNumericParts(versionPart: string): { readonly 'hasExplicitMinor': boolean; readonly 'major': number; readonly 'minor': number; readonly 'patch': number } | undefined {
    const parts = versionPart.split('.');

    if (parts.length < 1 || parts.length > 3) {
      return undefined;
    }

    const majorPart = parts[0];
    const minorPart = parts[1];
    const patchPart = parts[2];

    if (majorPart === undefined || !DateSemverPredicates.isSemverNumericPartValid(majorPart, { 'minorPart': minorPart, 'patchPart': patchPart })) {
      return undefined;
    }

    const major = Number.parseInt(majorPart, 10);
    const minor = minorPart !== undefined ? Number.parseInt(minorPart, 10) : 0;
    const patch = patchPart !== undefined ? Number.parseInt(patchPart, 10) : 0;

    return {
      'hasExplicitMinor': minorPart !== undefined,
      'major': major,
      'minor': minor,
      'patch': patch
    };
  }

  /** Each optional part, when present, must be all digits; `majorPart` is validated separately since it is required. */
  private static isSemverNumericPartValid(majorPart: string, options: Readonly<{ 'minorPart': string | undefined; 'patchPart': string | undefined }>): boolean {
    const { minorPart, patchPart } = options;

    if (!ALL_DIGITS_PATTERN.test(majorPart)) {
      return false;
    }
    if (minorPart !== undefined && !ALL_DIGITS_PATTERN.test(minorPart)) {
      return false;
    }
    if (patchPart !== undefined && !ALL_DIGITS_PATTERN.test(patchPart)) {
      return false;
    }

    return true;
  }

  /** Parses a semantic version string into its major, minor, patch, and prerelease components, or `undefined` when malformed. Build metadata (`+...`) is stripped and ignored per semver precedence rules. */
  private static parseSemverVersion(version: string): ParsedSemverInterface | undefined {
    const withoutV = version.trim().replace(SEMVER_LEADING_V_PATTERN, '');
    const { prerelease, versionPart } = DateSemverPredicates.splitSemverPrerelease(withoutV);
    const numericParts = DateSemverPredicates.parseSemverNumericParts(versionPart);

    if (numericParts === undefined) {
      return undefined;
    }

    return {
      'hasExplicitMinor': numericParts.hasExplicitMinor,
      'major': numericParts.major,
      'minor': numericParts.minor,
      'patch': numericParts.patch,
      'prerelease': prerelease
    };
  }

  private static satisfiesCaretRange(parsed: ParsedSemverInterface, rangeVersion: string): boolean {
    const target = DateSemverPredicates.parseSemverVersion(rangeVersion);

    if (target === undefined) {
      return false;
    }
    if (parsed.major !== target.major) {
      return false;
    }
    if (target.major === 0 && parsed.minor !== target.minor) {
      return false;
    }
    if (target.major === 0 && target.minor === 0 && parsed.patch !== target.patch) {
      return false;
    }

    const result = DateSemverPredicates.compareParsedSemver(parsed, target) >= 0;
    return result;
  }

  /** Handles `>=`/`<=`/`>`/`<`/`=` prefixes and the bare-version exact-match fallback. */
  private static satisfiesComparisonRange(parsed: ParsedSemverInterface, trimmedRange: string): boolean {
    const operatorPrefix = DateSemverPredicates.matchSemverOperatorPrefix(trimmedRange);
    const targetSource = operatorPrefix === undefined ? trimmedRange : trimmedRange.slice(operatorPrefix.length).trim();
    const target = DateSemverPredicates.parseSemverVersion(targetSource);

    if (target === undefined) {
      return false;
    }

    const order = DateSemverPredicates.compareParsedSemver(parsed, target);
    const comparator = operatorPrefix === undefined
      ? DateSemverPredicates.isOrderEqual
      : DateSemverPredicates.semverComparisonOperators.get(operatorPrefix)!;

    const result = comparator(order);
    return result;
  }

  private static satisfiesTildeRange(parsed: ParsedSemverInterface, rangeVersion: string): boolean {
    const target = DateSemverPredicates.parseSemverVersion(rangeVersion);

    if (target === undefined) {
      return false;
    }
    if (parsed.major !== target.major) {
      return false;
    }
    if (target.hasExplicitMinor && parsed.minor !== target.minor) {
      return false;
    }

    const result = DateSemverPredicates.compareParsedSemver(parsed, target) >= 0;
    return result;
  }

  private static splitSemverPrerelease(withoutV: string): { readonly 'prerelease': string; readonly 'versionPart': string } {
    const buildIndex = withoutV.indexOf('+');
    const trimmed = buildIndex >= 0 ? withoutV.slice(0, buildIndex) : withoutV;
    const prereleaseIndex = trimmed.indexOf('-');
    const versionPart = prereleaseIndex >= 0 ? trimmed.slice(0, prereleaseIndex) : trimmed;
    const prerelease = prereleaseIndex >= 0 ? trimmed.slice(prereleaseIndex + 1) : '';

    return { 'prerelease': prerelease, 'versionPart': versionPart };
  }
}
