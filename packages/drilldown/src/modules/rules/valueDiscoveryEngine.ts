
import { Predicates } from '#runtime';

import type { AlphabeticGroupValueEntity } from '../../entities/AlphabeticGroupValueEntity.js';
import type { CidrGroupValueEntity } from '../../entities/CidrGroupValueEntity.js';
import type { DateGranularityValueEntity } from '../../entities/DateGranularityValueEntity.js';
import type { DateGroupValueEntity } from '../../entities/DateGroupValueEntity.js';
import type { DiscoverValuesOptionsEntity } from '../../entities/DiscoverValuesOptionsEntity.js';
import type { DiscoveryStrategyEntity } from '../../entities/DiscoveryStrategyEntity.js';
import type { GroupValueEntity } from '../../entities/GroupValueEntity.js';
import type { RangeGroupValueEntity } from '../../entities/RangeGroupValueEntity.js';
import type { SemverGroupValueEntity } from '../../entities/SemverGroupValueEntity.js';
import type { SequentialGroupValueEntity } from '../../entities/SequentialGroupValueEntity.js';
import type { SequentialPatternResultEntity } from '../../entities/SequentialPatternResultEntity.js';
import type { StringGroupValueEntity } from '../../entities/StringGroupValueEntity.js';

import { DRILLDOWN_DEFAULTS } from '../../constants/index.js';
import {
  GroupingStrategy,
  PropertyType
} from '../../enums.js';
import { DrilldownUtilities } from '../DrilldownUtilities.js';
import {
  alphabeticHandler,
  MatcherHandlerLookup,
  sequentialHandler
} from '../matchers/index.js';
import { datePeriodResolver } from './datePeriodResolver.js';


interface ValueDiscoveryFunctionInterface {
  (values: unknown[], options: DiscoverValuesOptionsEntity.Type): GroupValueEntity.Type[]
}

class AlphabeticValues {
  static generate(
    values: unknown[],
    count: number,
    prefix: number | undefined,
    strategy: GroupingStrategy
  ): AlphabeticGroupValueEntity.Type[] {
    const strings: string[] = [];

    for (let index = 0; index < values.length; index++) {
      const string = String(values[index]).toLowerCase();

      if (string.length > 0) {
        strings.push(string);
      }
    }

    if (strings.length === 0) {
      return [];
    }

    const sortedStrings = strings.toSorted((first, second) => { const result = first.localeCompare(second); return result; });
    const itemCount = sortedStrings.length;
    const minimumString = sortedStrings[0]!;
    const maximumString = sortedStrings[itemCount - 1]!;

    if (minimumString === maximumString) {
      return [{
        'end': maximumString,
        'start': minimumString,
        'type': 'alphabetic'
      }];
    }

    const depth = prefix ?? 1;
    const handler = alphabeticHandler;

    if (strategy === GroupingStrategy.QUANTILE) {
      const indices = DrilldownUtilities.calculateRangeIndices(itemCount, count);
      const ranges: AlphabeticGroupValueEntity.Type[] = indices.map((range) => {
        return {
          'end': (sortedStrings[range.end]!).slice(0, depth),
          'start': (sortedStrings[range.start]!).slice(0, depth),
          'type': 'alphabetic'
        };
      });

      const computedResult = MatcherHandlerLookup.mergeOverlappingValues(ranges, handler);
      return computedResult;
    }

    const prefixes = PrefixCollector.collectAtDepth(sortedStrings, depth);
    const sortedPrefixes = Array.from(prefixes).toSorted((first, second) => { const result = first.localeCompare(second); return result; });
    const indices = DrilldownUtilities.calculateRangeIndices(sortedPrefixes.length, count);

    const computedResult = indices.map((range): AlphabeticGroupValueEntity.Type => {
      return {
        'end': sortedPrefixes[range.end]!,
        'start': sortedPrefixes[range.start]!,
        'type': 'alphabetic'
      };
    });
    return computedResult;
  }
}

class CidrValues {
  static generate(values: unknown[], cidr = 24): CidrGroupValueEntity.Type[] {
    const ips: string[] = [];

    for (let index = 0; index < values.length; index++) {
      const value = String(values[index]);

      if (Predicates.ipv4ToUint32(value) !== undefined) {
        ips.push(value);
      }
    }

    if (ips.length === 0) {
      return [];
    }

    const subnets = new Set<string>();

    for (let index = 0; index < ips.length; index++) {
      const parts = ips[index]!.split('.');

      if (cidr === 8) {
        subnets.add(`${parts[0]}.0.0.0/8`);
      }
      else if (cidr === 16) {
        subnets.add(`${parts[0]}.${parts[1]}.0.0/16`);
      }
      else {
        subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}.0/24`);
      }
    }

    const computedResult = Array.from(subnets)
      .toSorted((first, second) => {
        const rangeA = Predicates.parseCidrRange(first);
        const rangeB = Predicates.parseCidrRange(second);

        const result = (rangeA?.start ?? 0) - (rangeB?.start ?? 0);
        return result;
      })
      .map((subnet): CidrGroupValueEntity.Type => {
        return {
          'cidr': subnet,
          'type': 'cidr'
        };
      });
    return computedResult;
  }
}

class DateValues {
  static generate(
    values: unknown[],
    granularity: DateGranularityValueEntity.Type = 'month'
  ): DateGroupValueEntity.Type[] {
    const periods = new Set<string>();

    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      const dateString = Predicates.isNumberType(value)
        ? DrilldownUtilities.isoFromEpochMs(value)?.slice(0, 10) ?? null
        : null;

      if (dateString !== null) {
        const key = datePeriodResolver.getDatePeriodKey(dateString, granularity);

        periods.add(key);
      }
    }

    if (periods.size === 0) {
      return [];
    }

    const computedResult = Array.from(periods)
      .toSorted()
      .map((key) => { const result = datePeriodResolver.datePeriodToRange(key, granularity); return result; });
    return computedResult;
  }
}

class NumericValues {
  static generate(values: unknown[], options?: { 'count'?: number, 'strategy'?: GroupingStrategy }): RangeGroupValueEntity.Type[] {
    const count = options?.count ?? 5;
    const strategy = options?.strategy ?? GroupingStrategy.DISTRIBUTIVE;
    const numericValues = NumericValues.collectFinite(values);

    if (numericValues.length === 0) {
      return [];
    }

    const sorted = numericValues.toSorted((first, second) => { const result = first - second;
      return result; });
    const minimum = sorted[0]!;
    const maximum = sorted[sorted.length - 1]!;

    if (minimum === maximum) {
      return [{
        'maximum': maximum + 1,
        'minimum': minimum,
        'type': 'range'
      }];
    }

    if (strategy === GroupingStrategy.QUANTILE) {
      const result = NumericValues.buildQuantileRanges(sorted, count);

      return result;
    }

    const result = NumericValues.buildEqualWidthRanges(minimum, maximum, count);

    return result;
  }

  private static collectFinite(values: unknown[]): number[] {
    const numericValues: number[] = [];

    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      const number = Predicates.isNumberType(value) ? value : Number(value);

      if (!isNaN(number)) {
        numericValues.push(number);
      }
    }

    return numericValues;
  }

  private static buildQuantileRanges(sorted: number[], count: number): RangeGroupValueEntity.Type[] {
    const indices = DrilldownUtilities.calculateRangeIndices(sorted.length, count);

    const result = indices.map((range, index): RangeGroupValueEntity.Type => {
      const rangeMinimum = sorted[range.start]!;
      const rangeMaximum = index === indices.length - 1
        ? (sorted[range.end]!) + 0.001
        : sorted[range.end + 1]!;

      return {
        'maximum': rangeMaximum,
        'minimum': rangeMinimum,
        'type': 'range'
      };
    });

    return result;
  }

  private static buildEqualWidthRanges(minimum: number, maximum: number, count: number): RangeGroupValueEntity.Type[] {
    const rangeSize = (maximum - minimum) / count;
    const result: RangeGroupValueEntity.Type[] = [];

    for (let index = 0; index < count; index++) {
      result.push({
        'maximum': index === count - 1 ? maximum + 0.001 : minimum + ((index + 1) * rangeSize),
        'minimum': minimum + (index * rangeSize),
        'type': 'range'
      });
    }

    return result;
  }
}

class PrefixCollector {
  static collectAtDepth(sortedStrings: string[], depth: number): Set<string> {
    const prefixes = new Set<string>();

    for (let index = 0; index < sortedStrings.length; index++) {
      const prefix = sortedStrings[index]!.slice(0, depth).toLowerCase();

      if (prefix.length > 0) {
        prefixes.add(prefix);
      }
    }

    return prefixes;
  }
}

class PropertyTypeDetector {
  static detect(values: unknown[], property: string): PropertyType {
    if (property.endsWith('EpochMs')) {
      return PropertyType.DATE;
    }

    const sample = values.slice(0, Math.min(DRILLDOWN_DEFAULTS.typeDetectionSampleSize, values.length));
    const counts = PropertyTypeDetector.classifySample(sample);
    const threshold = sample.length * DRILLDOWN_DEFAULTS.typeDetectionThreshold;
    const result = PropertyTypeDetector.pickType(counts, threshold);

    return result;
  }

  private static classifySample(sample: unknown[]): { 'ipCount': number, 'numberCount': number, 'semverCount': number } {
    let numberCount = 0;
    let semverCount = 0;
    let ipCount = 0;

    for (let index = 0; index < sample.length; index++) {
      const value = sample[index];

      if (Predicates.isNumberType(value)) {
        numberCount++;
        continue;
      }

      if (Predicates.isString(value)) {
        const trimmed = value.trim();

        if (Predicates.ipv4ToUint32(trimmed) !== undefined) {
          ipCount++;
        }
        else if (DrilldownUtilities.parseSemver(trimmed) !== null && DRILLDOWN_DEFAULTS.semverDigitPattern.test(trimmed.replace(DRILLDOWN_DEFAULTS.leadingVPattern, ''))) {
          semverCount++;
        }
        else if (!isNaN(Number(trimmed)) && trimmed !== '') {
          numberCount++;
        }
      }
    }

    return { 'ipCount': ipCount, 'numberCount': numberCount, 'semverCount': semverCount };
  }

  private static pickType(counts: { 'ipCount': number, 'numberCount': number, 'semverCount': number }, threshold: number): PropertyType {
    if (counts.ipCount >= threshold) {
      return PropertyType.IP;
    }
    if (counts.semverCount >= threshold) {
      return PropertyType.SEMVER;
    }
    if (counts.numberCount >= threshold) {
      return PropertyType.NUMBER;
    }

    return PropertyType.STRING;
  }
}

class SemverValues {
  static generate(values: unknown[]): SemverGroupValueEntity.Type[] {
    const parsed: { 'original': string, 'parsed': NonNullable<ReturnType<typeof DrilldownUtilities.parseSemver>> }[] = [];

    for (let index = 0; index < values.length; index++) {
      const original = String(values[index]);
      const semverParsed = DrilldownUtilities.parseSemver(original);

      if (semverParsed !== null) {
        parsed.push({ 'original': original, 'parsed': semverParsed });
      }
    }

    if (parsed.length === 0) {
      return [];
    }

    const majorVersions = new Set<number>();

    for (let index = 0; index < parsed.length; index++) {
      const item = parsed[index]!;

      if (item.parsed !== null) {
        majorVersions.add(item.parsed.major);
      }
    }

    const result = Array.from(majorVersions)
      .toSorted((first, second) => { const comparison = first - second;
        return comparison; })
      .map((major): SemverGroupValueEntity.Type => {
        return {
          'semver': `^${major}.0.0`,
          'type': 'semver'
        };
      });
    return result;
  }
}

class SequentialPattern {
  static parse(value: string): null | readonly [prefix: string, number: string, suffix: string] {
    let numberStart = 0;

    while (numberStart < value.length) {
      const characterCode = value.charCodeAt(numberStart);

      if (characterCode >= 48 && characterCode <= 57) {
        break;
      }

      numberStart++;
    }

    if (numberStart === value.length) {
      return null;
    }

    let numberEnd = numberStart;

    while (numberEnd < value.length) {
      const characterCode = value.charCodeAt(numberEnd);

      if (characterCode < 48 || characterCode > 57) {
        break;
      }

      numberEnd++;
    }

    return [
      value.slice(0, numberStart),
      value.slice(numberStart, numberEnd),
      value.slice(numberEnd)
    ];
  }

  static detect(values: unknown[]): null | SequentialPatternResultEntity.Type {
    if (values.length < DRILLDOWN_DEFAULTS.minimumSequentialValues) {
      return null;
    }

    const parsed: { 'number': number
      'padding': number
      'prefix': string
      'suffix': string; }[] = [];

    for (let index = 0; index < values.length; index++) {
      const string = String(values[index]);
      const segments = SequentialPattern.parse(string);

      if (segments === null) {
        return null;
      }

      const [prefix, numberString, suffix] = segments;

      parsed.push({
        'number': parseInt(numberString, 10),
        'padding': numberString.length,
        'prefix': prefix,
        'suffix': suffix
      });
    }

    const firstItem = parsed[0];

    if (firstItem === undefined) {
      return null;
    }

    const referencePrefix = firstItem.prefix;
    const referenceSuffix = firstItem.suffix;
    const referencePadding = firstItem.padding;

    for (let index = 0; index < parsed.length; index++) {
      const item = parsed[index]!;

      if (item.prefix !== referencePrefix || item.suffix !== referenceSuffix) {
        return null;
      }
    }

    const numbers = parsed.map((item) => { const result = item.number; return result; }).toSorted((first, second) => { const result = first - second;
      return result; });
    const firstNumber = numbers[0];
    const lastNumber = numbers[numbers.length - 1];

    if (firstNumber === undefined || lastNumber === undefined) {
      return null;
    }

    const expectedCount = lastNumber - firstNumber + 1;
    const uniqueNumbers = new Set(numbers).size;
    const density = uniqueNumbers / expectedCount;

    return {
      'density': density,
      'maximum': lastNumber,
      'minimum': firstNumber,
      'padding': referencePadding,
      'prefix': referencePrefix,
      'suffix': referenceSuffix
    };
  }
}

class SequentialValues {
  static generate(
    pattern: SequentialPatternResultEntity.Type,
    values: unknown[],
    count: number,
    strategy: GroupingStrategy
  ): SequentialGroupValueEntity.Type[] {
    const { maximum, minimum, padding, prefix, suffix } = pattern;

    if (minimum === maximum || count <= 1) {
      return [SequentialValues.toSequentialValue(minimum, maximum, padding, prefix, suffix)];
    }

    if (strategy === GroupingStrategy.QUANTILE) {
      const result = SequentialValues.buildQuantileSequential(values, pattern, count);

      return result;
    }

    const result = SequentialValues.buildEqualWidthSequential(pattern, count);

    return result;
  }

  private static toSequentialValue(
    minimum: number,
    maximum: number,
    padding: number,
    prefix: string,
    suffix: string
  ): SequentialGroupValueEntity.Type {
    return {
      'sequential': {
        'maximum': maximum,
        'minimum': minimum,
        'padding': padding,
        'prefix': prefix,
        ...(suffix !== '' && { 'suffix': suffix })
      },
      'type': 'sequential'
    };
  }

  private static collectMatchingNumbers(values: unknown[], prefix: string, suffix: string): number[] {
    const numbers: number[] = [];

    for (let index = 0; index < values.length; index++) {
      const string = String(values[index]);

      if (string.length < prefix.length + suffix.length || !string.startsWith(prefix) || !string.endsWith(suffix)) {
        continue;
      }

      const digits = string.slice(prefix.length, string.length - suffix.length);

      if (DRILLDOWN_DEFAULTS.allDigitsPattern.test(digits)) {
        numbers.push(parseInt(digits, 10));
      }
    }

    return numbers;
  }

  private static buildQuantileSequential(
    values: unknown[],
    pattern: SequentialPatternResultEntity.Type,
    count: number
  ): SequentialGroupValueEntity.Type[] {
    const { padding, prefix, suffix } = pattern;
    const numbers = SequentialValues.collectMatchingNumbers(values, prefix, suffix);

    if (numbers.length === 0) {
      return [];
    }

    const sortedNumbers = numbers.toSorted((first, second) => { const result = first - second;
      return result; });
    const indices = DrilldownUtilities.calculateRangeIndices(sortedNumbers.length, count);
    const ranges: SequentialGroupValueEntity.Type[] = indices.map((range) => {
      const result = SequentialValues.toSequentialValue(sortedNumbers[range.start]!, sortedNumbers[range.end]!, padding, prefix, suffix);

      return result;
    });
    const handler = sequentialHandler;
    const result = MatcherHandlerLookup.mergeOverlappingValues(ranges, handler);

    return result;
  }

  private static buildEqualWidthSequential(
    pattern: SequentialPatternResultEntity.Type,
    count: number
  ): SequentialGroupValueEntity.Type[] {
    const { maximum, minimum, padding, prefix, suffix } = pattern;
    const totalRange = maximum - minimum + 1;
    const indices = DrilldownUtilities.calculateRangeIndices(totalRange, count);

    const result = indices.map((range): SequentialGroupValueEntity.Type => {
      const rangeResult = SequentialValues.toSequentialValue(minimum + range.start, minimum + range.end, padding, prefix, suffix);

      return rangeResult;
    });

    return result;
  }
}

class StringValues {
  static generate(values: unknown[], options: DiscoverValuesOptionsEntity.Type): GroupValueEntity.Type[] {
    const resolved = StringValues.resolveOptions(options);
    const sequentialResult = StringValues.trySequential(values, resolved);

    if (sequentialResult !== null) {
      return sequentialResult;
    }

    const valueCounts = StringValues.countValues(values);

    if (resolved.strategy === 'alphabetic' && valueCounts.size > resolved.maximumValues) {
      const alphabeticResult = AlphabeticValues.generate(values, resolved.count, resolved.prefix, resolved.groupingStrategy);

      return alphabeticResult;
    }

    const result = StringValues.topByFrequency(valueCounts, resolved.maximumValues);

    return result;
  }

  private static resolveOptions(options: DiscoverValuesOptionsEntity.Type): { 'count': number, 'density': number, 'groupingStrategy': GroupingStrategy, 'maximumValues': number, 'prefix': number | undefined, 'strategy': DiscoveryStrategyEntity.Type } {
    const strategy = options.strategy ?? 'sequential';
    const groupingStrategy = strategy === 'quantile' ? GroupingStrategy.QUANTILE : GroupingStrategy.DISTRIBUTIVE;

    return {
      'count': options.granularity?.count ?? DRILLDOWN_DEFAULTS.defaultGroupCount,
      'density': options.granularity?.density ?? DRILLDOWN_DEFAULTS.defaultDensityThreshold,
      'groupingStrategy': groupingStrategy,
      'maximumValues': options.maximumValues ?? DRILLDOWN_DEFAULTS.defaultMaximumStringValues,
      'prefix': options.granularity?.prefix,
      'strategy': strategy
    };
  }

  private static trySequential(values: unknown[], resolved: { 'count': number, 'density': number, 'groupingStrategy': GroupingStrategy, 'maximumValues': number, 'prefix': number | undefined, 'strategy': DiscoveryStrategyEntity.Type }): GroupValueEntity.Type[] | null {
    if (resolved.strategy === 'alphabetic') {
      return null;
    }

    const detectedPattern = SequentialPattern.detect(values);

    if (detectedPattern === null || detectedPattern.density < resolved.density) {
      return null;
    }

    const result = SequentialValues.generate(detectedPattern, values, resolved.count, resolved.groupingStrategy);

    return result;
  }

  private static countValues(values: unknown[]): Map<string, number> {
    const valueCounts = new Map<string, number>();

    for (let index = 0; index < values.length; index++) {
      const string = String(values[index]);

      valueCounts.set(string, (valueCounts.get(string) ?? 0) + 1);
    }

    return valueCounts;
  }

  private static topByFrequency(valueCounts: Map<string, number>, maximumValues: number): StringGroupValueEntity.Type[] {
    const sorted = Array.from(valueCounts.entries())
      .toSorted((first, second) => { const result = second[1] - first[1];
        return result; })
      .slice(0, maximumValues);

    const result = sorted.map(([match]): StringGroupValueEntity.Type => {
      return {
        'match': match,
        'type': 'string'
      };
    });

    return result;
  }
}

class NumericDispatchHandler {
  static generate(values: unknown[], options: DiscoverValuesOptionsEntity.Type): GroupValueEntity.Type[] {
    const count = options.granularity?.count ?? 5;
    const strategy = options.strategy === 'quantile'
      ? GroupingStrategy.QUANTILE
      : GroupingStrategy.DISTRIBUTIVE;
    const result = NumericValues.generate(values, { 'count': count, 'strategy': strategy });

    return result;
  }
}

class DateDispatchHandler {
  static generate(values: unknown[], options: DiscoverValuesOptionsEntity.Type): GroupValueEntity.Type[] {
    const result = DateValues.generate(values, options.granularity?.date);
    return result;
  }
}

class IpDispatchHandler {
  static generate(values: unknown[], options: DiscoverValuesOptionsEntity.Type): GroupValueEntity.Type[] {
    const result = CidrValues.generate(values, options.granularity?.cidr);
    return result;
  }
}

const valueDiscoveryDispatch: Record<PropertyType, ValueDiscoveryFunctionInterface> = {
  'date': DateDispatchHandler.generate,
  'ip': IpDispatchHandler.generate,
  'number': NumericDispatchHandler.generate,
  'semver': SemverValues.generate,
  'string': StringValues.generate
};

/**
 * Discovers and generates group values from data based on property type.
 */
export const valueDiscoveryEngine = {
  /**
   * Discovers and generates group values for a property.
   * @param data - Array of data records to analyze
   * @param property - Property name to discover values for
   * @param options - Discovery options including type and granularity
   * @returns Array of group values suitable for grouping
   */
  'discoverValues': function (data: Record<string, unknown>[], property: string, options: DiscoverValuesOptionsEntity.Type = {}): GroupValueEntity.Type[] {
    const values: unknown[] = [];

    for (let index = 0; index < data.length; index++) {
      const value = DrilldownUtilities.getPropertyValue(data[index]!, property);

      if (value !== null && value !== undefined) {
        values.push(value);
      }
    }

    if (values.length === 0) {
      return [];
    }

    const detectedType = options.type ?? PropertyTypeDetector.detect(values, property);
    const handler = valueDiscoveryDispatch[detectedType];

    const result = handler(values, options);
    return result;
  }
};
