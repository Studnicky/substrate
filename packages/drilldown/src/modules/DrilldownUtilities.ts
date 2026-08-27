import { LruCache } from '@studnicky/cache';
import { Predicates } from '@studnicky/types';

import type { JsonPropertyTypeEntity } from '../entities/JsonPropertyTypeEntity.js';
import type { NumericGroupEntity } from '../entities/NumericGroupEntity.js';
import type { ParsedSemverEntity } from '../entities/ParsedSemverEntity.js';
import type { RangeIndicesEntity } from '../entities/RangeIndicesEntity.js';

import { DRILLDOWN_DEFAULTS } from '../constants/index.js';

/**
 * Utility class providing helper methods for data analysis, type detection, value parsing,
 * and range calculations used throughout the grouping operations.
 */
export class DrilldownUtilities {
  private static readonly pathCache: LruCache<string, (number | string)[]> = LruCache
    .create<string, (number | string)[]>({ 'capacity': DRILLDOWN_DEFAULTS.maximumPathCacheSize });

  /**
   * Calculates how evenly distributed a set of values are, returning a score from 0 to 1.
   */
  static calculateDistributionBalance(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    let total = 0;

    for (let index = 0; index < values.length; index++) {
      total += values[index]!;
    }

    const mean = total / values.length;
    let varianceSum = 0;

    for (let index = 0; index < values.length; index++) {
      const value = values[index]!;

      varianceSum += (value - mean) * (value - mean);
    }

    const variance = varianceSum / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;

    const result = Math.max(0, 1 - cv);
    return result;
  }

  /**
   * Divides a collection into evenly sized ranges and returns the start/end indices for each.
   */
  static calculateRangeIndices(itemCount: number, targetCount: number): RangeIndicesEntity.Type[] {
    if (itemCount === 0 || targetCount <= 0) {
      return [];
    }

    const effectiveCount = Math.min(targetCount, itemCount);
    const itemsPerRange = Math.ceil(itemCount / effectiveCount);
    const ranges: RangeIndicesEntity.Type[] = [];

    for (let index = 0; index < effectiveCount; index++) {
      const start = index * itemsPerRange;

      if (start >= itemCount) {
        break;
      }

      ranges.push({
        'end': Math.min(start + itemsPerRange - 1, itemCount - 1),
        'start': start
      });
    }

    return ranges;
  }

  /**
   * Compares two semantic version strings.
   */
  static compareSemver(first: string, second: string): number {
    const parsedA = DrilldownUtilities.parseSemver(first);
    const parsedB = DrilldownUtilities.parseSemver(second);

    if (parsedA === null && parsedB === null) {
      return 0;
    }
    if (parsedA === null) {
      return 1;
    }
    if (parsedB === null) {
      const result = -1;
      return result;
    }

    const coreResult = DrilldownUtilities.compareParsedSemver(parsedA, parsedB);

    if (coreResult !== 0) {
      return coreResult;
    }

    if (parsedA.prerelease !== '' && parsedB.prerelease === '') {
      const result = -1;
      return result;
    }
    if (parsedA.prerelease === '' && parsedB.prerelease !== '') {
      return 1;
    }
    if (parsedA.prerelease !== '' && parsedB.prerelease !== '') {
      const result = parsedA.prerelease.localeCompare(parsedB.prerelease);
      return result;
    }

    return 0;
  }

  /**
   * Creates numeric range groups that evenly span the minimum/maximum of the provided values.
   */
  static createGroups(values: number[], groupCount: number): NumericGroupEntity.Type[] {
    if (values.length === 0) {
      return [];
    }

    let minimum = values[0]!;
    let maximum = values[0]!;

    for (let i = 1; i < values.length; i++) {
      const value = values[i]!;

      if (value < minimum) {
        minimum = value;
      }
      if (value > maximum) {
        maximum = value;
      }
    }

    if (minimum === maximum) {
      return [{
        'label': `${minimum}`,
        'maximum': maximum,
        'minimum': minimum
      }];
    }

    const groupSize = (maximum - minimum) / groupCount;
    const precision = 10;
    const groups: NumericGroupEntity.Type[] = [];

    for (let i = 0; i < groupCount; i++) {
      const groupMinimum = DrilldownUtilities.roundToPrecision(minimum + (i * groupSize), precision);
      const groupMaximum = i === groupCount - 1 ? maximum : DrilldownUtilities.roundToPrecision(minimum + ((i + 1) * groupSize), precision);

      groups.push({
        'label': `${groupMinimum.toFixed(2)}-${groupMaximum.toFixed(2)}`,
        'maximum': groupMaximum,
        'minimum': groupMinimum
      });
    }

    return groups;
  }

  /**
   * Detects the data type of a value.
   */
  static detectType(value: unknown): JsonPropertyTypeEntity.Type {
    if (Predicates.isNullish(value)) {
      return 'null';
    }
    if (Predicates.isArray(value)) {
      return 'array';
    }
    if (Predicates.isObjectLike(value)) {
      return 'object';
    }
    if (Predicates.isNumberType(value)) {
      return 'number';
    }
    if (Predicates.isBoolean(value)) {
      return 'boolean';
    }
    if (Predicates.isString(value)) {
      const trimmed = value.trim();

      if (trimmed === '') {
        return 'string';
      }
      if (!isNaN(Number(trimmed))) {
        return 'number';
      }
    }

    return 'string';
  }

  /**
   * Finds which numeric group a value belongs to and returns that group's label.
   */
  static getNumericGroup(value: number, groups: NumericGroupEntity.Type[]): string {
    for (let index = 0; index < groups.length; index++) {
      const group = groups[index]!;

      if (value >= group.minimum && value <= group.maximum) {
        return group.label;
      }
    }

    return 'unknown';
  }

  /**
   * Retrieves a nested property value from an object using dot notation or bracket syntax.
   */
  static getPropertyValue(object: unknown, path: string): unknown {
    if (Predicates.isNullish(object)) {
      return undefined;
    }

    if (!path.includes('.') && !path.includes('[')) {
      return (object as Record<string, unknown>)[path];
    }

    let parts = DrilldownUtilities.pathCache.get(path);

    if (parts === undefined) {
      parts = DrilldownUtilities.parsePath(path);
      DrilldownUtilities.pathCache.set(path, parts);
    }

    let current: unknown = object;

    for (let index = 0; index < parts.length; index++) {
      if (Predicates.isNullish(current)) {
        return undefined;
      }
      current = (current as Record<number | string, unknown>)[parts[index]!];
    }

    return current;
  }

  /**
   * Formats epoch milliseconds as an ISO-8601 instant string (`YYYY-MM-DDTHH:mm:ss.sssZ`)
   * using integer civil-calendar arithmetic (Howard Hinnant's algorithm). Never constructs
   * a JS `Date` object.
   */
  static isoFromEpochMs(raw: number): null | string {
    if (!Number.isFinite(raw)) {
      return null;
    }

    const epochMs = Math.trunc(raw);
    const day = Math.floor(epochMs / 86_400_000);
    const timeMs = epochMs - (day * 86_400_000);
    const date = DrilldownUtilities.civilFromDays(day);
    const hour = Math.floor(timeMs / 3_600_000);
    const minute = Math.floor((timeMs % 3_600_000) / 60_000);
    const second = Math.floor((timeMs % 60_000) / 1_000);
    const millisecond = timeMs % 1_000;

    return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(millisecond).padStart(3, '0')}Z`;
  }

  /**
   * Determines if an IPv4 address falls within a CIDR range.
   */
  static ipInCidr(ip: string, cidr: string): boolean {
    const ipNumber = DrilldownUtilities.ipToNumber(ip);

    if (ipNumber === null) {
      return false;
    }

    const range = DrilldownUtilities.parseCidr(cidr);

    if (range === null) {
      return false;
    }

    const result = ipNumber >= range.start && ipNumber <= range.end;
    return result;
  }

  /**
   * Converts an IPv4 address string to its 32-bit unsigned integer representation.
   */
  static ipToNumber(ip: string): null | number {
    const parts = ip.trim().split('.');

    if (parts.length !== 4) {
      return null;
    }

    let accumulator = 0;

    for (let index = 0; index < parts.length; index++) {
      const number = parseInt(parts[index]!, 10);

      if (isNaN(number) || number < 0 || number > 255) {
        return null;
      }
      accumulator = (accumulator << 8) + number;
    }

    const result = accumulator >>> 0;
    return result;
  }

  /**
   * Parses a CIDR notation string into its numeric IP range.
   */
  static parseCidr(cidr: string): null | RangeIndicesEntity.Type {
    const parts = cidr.trim().split('/');

    if (parts.length !== 2) {
      return null;
    }

    const ipPart = parts[0];
    const prefixPart = parts[1];

    if (ipPart === undefined || prefixPart === undefined) {
      return null;
    }

    const ip = DrilldownUtilities.ipToNumber(ipPart);

    if (ip === null) {
      return null;
    }

    const prefix = parseInt(prefixPart, 10);

    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      return null;
    }

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const start = (ip & mask) >>> 0;
    const end = (start | (~mask >>> 0)) >>> 0;

    return {
      'end': end,
      'start': start
    };
  }

  /**
   * Parses a semantic version string into its major, minor, patch, and prerelease components.
   */
  static parseSemver(version: string): null | ParsedSemverEntity.Type {
    const trimmed = version.trim().replace(DRILLDOWN_DEFAULTS.leadingVPattern, '');
    const prereleaseIndex = trimmed.indexOf('-');
    const versionPart = prereleaseIndex >= 0 ? trimmed.slice(0, prereleaseIndex) : trimmed;
    const prerelease = prereleaseIndex >= 0 ? trimmed.slice(prereleaseIndex + 1) : '';
    const parts = versionPart.split('.');

    if (parts.length < 1 || parts.length > 3) {
      return null;
    }

    const majorPart = parts[0];
    const minorPart = parts[1];
    const patchPart = parts[2];

    if (majorPart === undefined) {
      return null;
    }

    const major = parseInt(majorPart, 10);
    const minor = minorPart !== undefined ? parseInt(minorPart, 10) : 0;
    const patch = patchPart !== undefined ? parseInt(patchPart, 10) : 0;

    if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
      return null;
    }

    if (major < 0 || minor < 0 || patch < 0) {
      return null;
    }

    return {
      'major': major,
      'minor': minor,
      'patch': patch,
      'prerelease': prerelease
    };
  }

  /**
   * Checks if a version string satisfies a semver range expression.
   */
  static semverSatisfies(version: string, range: string): boolean {
    const parsed = DrilldownUtilities.parseSemver(version);

    if (parsed === null) {
      return false;
    }

    const trimmedRange = range.trim();

    if (trimmedRange === '*') {
      return true;
    }

    if (trimmedRange.startsWith('^')) {
      const target = DrilldownUtilities.parseSemver(trimmedRange.slice(1));

      if (target === null) {
        return false;
      }

      if (parsed.major !== target.major) {
        return false;
      }

      if (target.major === 0 && parsed.minor !== target.minor) {
        return false;
      }

      const result = DrilldownUtilities.compareParsedSemver(parsed, target) >= 0;
      return result;
    }

    if (trimmedRange.startsWith('~')) {
      const target = DrilldownUtilities.parseSemver(trimmedRange.slice(1));

      if (target === null) {
        return false;
      }

      if (parsed.major !== target.major || parsed.minor !== target.minor) {
        return false;
      }

      const result = DrilldownUtilities.compareParsedSemver(parsed, target) >= 0;
      return result;
    }

    if (trimmedRange.startsWith('>=')) {
      const target = DrilldownUtilities.parseSemver(trimmedRange.slice(2).trim());

      if (target === null) {
        return false;
      }

      const result = DrilldownUtilities.compareParsedSemver(parsed, target) >= 0;
      return result;
    }
    if (trimmedRange.startsWith('<=')) {
      const result = DrilldownUtilities.compareSemver(version, trimmedRange.slice(2).trim()) <= 0;
      return result;
    }
    if (trimmedRange.startsWith('>')) {
      const result = DrilldownUtilities.compareSemver(version, trimmedRange.slice(1).trim()) > 0;
      return result;
    }
    if (trimmedRange.startsWith('<')) {
      const result = DrilldownUtilities.compareSemver(version, trimmedRange.slice(1).trim()) < 0;
      return result;
    }
    if (trimmedRange.startsWith('=')) {
      const result = DrilldownUtilities.compareSemver(version, trimmedRange.slice(1).trim()) === 0;
      return result;
    }

    const result = DrilldownUtilities.compareSemver(version, trimmedRange) === 0;
    return result;
  }

  /**
   * Determines if a string falls within an alphabetic range (case-insensitive).
   */
  static stringInAlphabeticRange(value: string, start: string, end: string): boolean {
    const lowerValue = value.toLowerCase();
    const lowerStart = start.toLowerCase();
    const lowerEnd = end.toLowerCase();

    const result = lowerValue.localeCompare(lowerStart) >= 0 && lowerValue.localeCompare(lowerEnd) <= 0;
    return result;
  }

  private static civilFromDays(days: number): { 'day': number, 'month': number, 'year': number } {
    const shiftedDays = days + 719_468;
    const era = Math.floor(shiftedDays / 146_097);
    const dayOfEra = shiftedDays - (era * 146_097);
    const yearOfEra = Math.floor((dayOfEra - Math.floor(dayOfEra / 1_460) + Math.floor(dayOfEra / 36_524) - Math.floor(dayOfEra / 146_096)) / 365);
    const yearBase = yearOfEra + (era * 400);
    const dayOfYear = dayOfEra - ((365 * yearOfEra) + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
    const monthPrime = Math.floor(((5 * dayOfYear) + 2) / 153);
    const day = dayOfYear - Math.floor(((153 * monthPrime) + 2) / 5) + 1;
    const month = monthPrime + (monthPrime < 10 ? 3 : -9);
    const year = yearBase + (month <= 2 ? 1 : 0);

    return {
      'day': day,
      'month': month,
      'year': year
    };
  }

  private static compareParsedSemver(first: ParsedSemverEntity.Type, second: ParsedSemverEntity.Type): number {
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

  private static parsePath(path: string): (number | string)[] {
    const parts: (number | string)[] = [];
    let current = '';
    let i = 0;

    while (i < path.length) {
      const char = path[i];

      if (char === '.') {
        if (current !== '') {
          parts.push(current);
          current = '';
        }
        i++;
      }
      else if (char === '[') {
        if (current !== '') {
          parts.push(current);
          current = '';
        }
        i++;
        let indexString = '';

        while (i < path.length && path[i] !== ']') {
          indexString += path[i];
          i++;
        }
        const index = parseInt(indexString, 10);

        if (!isNaN(index)) {
          parts.push(index);
        }
        i++;
      }
      else {
        current += char;
        i++;
      }
    }

    if (current !== '') {
      parts.push(current);
    }

    return parts;
  }

  private static roundToPrecision(value: number, precision: number): number {
    const factor = Math.pow(10, precision);

    const result = Math.round(value * factor) / factor;
    return result;
  }
}
