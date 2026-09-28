import { Predicates } from '@studnicky/types/browser';

import type { AlphabeticGroupValueEntity } from '../../entities/AlphabeticGroupValueEntity.js';
import type { AlphabeticRangeEntity } from '../../entities/AlphabeticRangeEntity.js';
import type { CidrGroupValueEntity } from '../../entities/CidrGroupValueEntity.js';
import type { CidrRangeEntity } from '../../entities/CidrRangeEntity.js';
import type { DateGroupValueEntity } from '../../entities/DateGroupValueEntity.js';
import type { DateRangeEntity } from '../../entities/DateRangeEntity.js';
import type { GroupValueDiscriminantEntity } from '../../entities/GroupValueDiscriminantEntity.js';
import type { GroupValueEntity } from '../../entities/GroupValueEntity.js';
import type { RangeEntity } from '../../entities/RangeEntity.js';
import type { RangeGroupValueEntity } from '../../entities/RangeGroupValueEntity.js';
import type { SemverGroupValueEntity } from '../../entities/SemverGroupValueEntity.js';
import type { SemverRangeEntity } from '../../entities/SemverRangeEntity.js';
import type { SequentialGroupValueEntity } from '../../entities/SequentialGroupValueEntity.js';
import type { SequentialRangeEntity } from '../../entities/SequentialRangeEntity.js';
import type { StringGroupValueEntity } from '../../entities/StringGroupValueEntity.js';
import type {
  AlphabeticMatcherInterface,
  CidrMatcherInterface,
  DateMatcherInterface,
  MatchContextInterface,
  MatcherHandlerInterface,
  PartitionGroupInterface,
  RangeMatcherInterface,
  SemverMatcherInterface,
  SequentialMatcherInterface,
  StringMatcherInterface
} from '../../interfaces/index.js';

import { DRILLDOWN_DEFAULTS } from '../../constants/index.js';
import { TypeGuards } from '../../typeguards/index.js';

class StringHandler {
  public static compare(first: string, second: string): number {
    const result = first.localeCompare(second);
    return result;
  }

  public static createMatcher(valueDef: StringGroupValueEntity.Type, group: PartitionGroupInterface): StringMatcherInterface {
    return {
      'group': group,
      'match': valueDef.match
    };
  }

  public static createNodeValue(valueDef: StringGroupValueEntity.Type): string {
    const result = valueDef.match;
    return result;
  }

  public static isGroupValue(value: GroupValueEntity.Type): value is StringGroupValueEntity.Type {
    const result = 'match' in value;
    return result;
  }

  public static isNodeValue(value: unknown): value is string {
    const result = Predicates.isString(value);
    return result;
  }

  public static match(matcher: StringMatcherInterface, _value: unknown, stringValue: string): boolean {
    const result = stringValue === matcher.match;
    return result;
  }

  public static validate(valueDef: StringGroupValueEntity.Type, path: string): string[] {
    const errors: string[] = [];

    if (valueDef.match === '') {
      errors.push(`${path}: missing 'match' field`);
    }

    return errors;
  }
}

class RangeHandler {
  public static compare(first: RangeEntity.Type, second: RangeEntity.Type): number {
    const result = first.minimum !== second.minimum ? first.minimum - second.minimum : first.maximum - second.maximum;
    return result;
  }

  public static createMatcher(valueDef: RangeGroupValueEntity.Type, group: PartitionGroupInterface): RangeMatcherInterface {
    return {
      'group': group,
      'maximum': valueDef.maximum,
      'minimum': valueDef.minimum
    };
  }

  public static createNodeValue(valueDef: RangeGroupValueEntity.Type): RangeEntity.Type {
    return {
      'maximum': valueDef.maximum,
      'minimum': valueDef.minimum
    };
  }

  public static getSortKey(matcher: RangeMatcherInterface): number {
    const result = matcher.minimum;
    return result;
  }

  public static isGroupValue(value: GroupValueEntity.Type): value is RangeGroupValueEntity.Type {
    const result = 'minimum' in value && 'maximum' in value && !('sequential' in value);
    return result;
  }

  public static isNodeValue(value: unknown): value is RangeEntity.Type {
    const result = TypeGuards.isRange(value);
    return result;
  }

  public static match(matcher: RangeMatcherInterface, value: unknown, _stringValue: string, context: MatchContextInterface): boolean {
    const numericValue = context.toDateTimestamp(value) ?? context.toStrictNumber(value);

    if (numericValue === null) {
      return false;
    }

    const result = Predicates.performRangeComparison(numericValue, matcher.minimum, matcher.maximum, true, { 'boundary': 'half-open' });
    return result;
  }

  public static validate(valueDef: RangeGroupValueEntity.Type, path: string): string[] {
    const errors: string[] = [];

    if (!Predicates.isNumberType(valueDef.minimum)) {
      errors.push(`${path}: missing 'minimum' field`);
    }
    if (!Predicates.isNumberType(valueDef.maximum)) {
      errors.push(`${path}: missing 'maximum' field`);
    }
    if (Predicates.isNumberType(valueDef.minimum) && Predicates.isNumberType(valueDef.maximum) && valueDef.minimum > valueDef.maximum) {
      errors.push(`${path}: minimum cannot be greater than maximum`);
    }

    return errors;
  }
}

class CidrHandler {
  public static compare(first: CidrRangeEntity.Type, second: CidrRangeEntity.Type): number {
    const rangeFirst = Predicates.parseCidrRange(first.cidr);
    const rangeSecond = Predicates.parseCidrRange(second.cidr);

    if (rangeFirst === undefined && rangeSecond === undefined) {
      return 0;
    }
    if (rangeFirst === undefined) {
      return 1;
    }
    if (rangeSecond === undefined) {
      const result = -1;
      return result;
    }

    const result = rangeFirst.start !== rangeSecond.start ? rangeFirst.start - rangeSecond.start : rangeFirst.end - rangeSecond.end;
    return result;
  }

  public static createMatcher(valueDef: CidrGroupValueEntity.Type, group: PartitionGroupInterface): CidrMatcherInterface | null {
    const range = Predicates.parseCidrRange(valueDef.cidr);

    if (range === undefined) {
      return null;
    }

    return {
      'end': range.end,
      'group': group,
      'start': range.start
    };
  }

  public static createNodeValue(valueDef: CidrGroupValueEntity.Type): CidrRangeEntity.Type {
    return { 'cidr': valueDef.cidr };
  }

  public static isGroupValue(value: GroupValueEntity.Type): value is CidrGroupValueEntity.Type {
    const result = 'cidr' in value;
    return result;
  }

  public static isNodeValue(value: unknown): value is CidrRangeEntity.Type {
    const result = TypeGuards.isCidrRange(value);
    return result;
  }

  public static match(matcher: CidrMatcherInterface, _value: unknown, stringValue: string): boolean {
    const ipNumber = Predicates.ipv4ToUint32(stringValue);

    if (ipNumber === undefined) {
      return false;
    }

    const result = Predicates.performRangeComparison(ipNumber, matcher.start, matcher.end, true);
    return result;
  }

  public static validate(valueDef: CidrGroupValueEntity.Type, path: string): string[] {
    const errors: string[] = [];

    if (valueDef.cidr === '') {
      errors.push(`${path}: missing 'cidr' field`);
    }
    else if (Predicates.parseCidrRange(valueDef.cidr) === undefined) {
      errors.push(`${path}: invalid CIDR notation '${valueDef.cidr}'`);
    }

    return errors;
  }
}

class SemverHandler {
  public static compare(first: SemverRangeEntity.Type, second: SemverRangeEntity.Type): number {
    const firstVersion = first.semver.replace(DRILLDOWN_DEFAULTS.semverPrefixPattern, '');
    const secondVersion = second.semver.replace(DRILLDOWN_DEFAULTS.semverPrefixPattern, '');

    const result = Predicates.compareSemverVersions(firstVersion, secondVersion);
    return result;
  }

  public static createMatcher(valueDef: SemverGroupValueEntity.Type, group: PartitionGroupInterface): SemverMatcherInterface {
    return {
      'group': group,
      'range': valueDef.semver
    };
  }

  public static createNodeValue(valueDef: SemverGroupValueEntity.Type): SemverRangeEntity.Type {
    return { 'semver': valueDef.semver };
  }

  public static isGroupValue(value: GroupValueEntity.Type): value is SemverGroupValueEntity.Type {
    const result = 'semver' in value;
    return result;
  }

  public static isNodeValue(value: unknown): value is SemverRangeEntity.Type {
    const result = TypeGuards.isSemverRange(value);
    return result;
  }

  public static match(matcher: SemverMatcherInterface, _value: unknown, stringValue: string): boolean {
    const result = Predicates.satisfiesSemverRange(stringValue, matcher.range);
    return result;
  }

  public static validate(valueDef: SemverGroupValueEntity.Type, path: string): string[] {
    const errors: string[] = [];

    if (valueDef.semver === '') {
      errors.push(`${path}: missing 'semver' field`);
    }

    return errors;
  }
}

class DateHandler {
  public static compare(first: DateRangeEntity.Type, second: DateRangeEntity.Type): number {
    const afterDiff = first.after - second.after;

    if (afterDiff !== 0) {
      return afterDiff;
    }

    const result = first.before - second.before;
    return result;
  }

  public static createMatcher(valueDef: DateGroupValueEntity.Type, group: PartitionGroupInterface): DateMatcherInterface {
    return {
      'afterTs': valueDef.after,
      'beforeTs': valueDef.before,
      'group': group
    };
  }

  public static createNodeValue(valueDef: DateGroupValueEntity.Type): DateRangeEntity.Type {
    return {
      'after': valueDef.after,
      'before': valueDef.before
    };
  }

  public static getSortKey(matcher: DateMatcherInterface): number {
    const result = matcher.afterTs;
    return result;
  }

  public static isGroupValue(value: GroupValueEntity.Type): value is DateGroupValueEntity.Type {
    const result = 'after' in value && 'before' in value;
    return result;
  }

  public static isNodeValue(value: unknown): value is DateRangeEntity.Type {
    const result = TypeGuards.isDateRange(value);
    return result;
  }

  public static match(matcher: DateMatcherInterface, value: unknown, _stringValue: string, context: MatchContextInterface): boolean {
    const dateValue = context.toDateTimestamp(value);

    if (dateValue === null) {
      return false;
    }

    const result = Predicates.performRangeComparison(dateValue, matcher.afterTs, matcher.beforeTs, true, { 'boundary': 'half-open' });
    return result;
  }

  public static validate(valueDef: DateGroupValueEntity.Type, path: string): string[] {
    const errors: string[] = [];

    if (!Number.isFinite(valueDef.after)) {
      errors.push(`${path}: missing 'after' field`);
    }
    if (!Number.isFinite(valueDef.before)) {
      errors.push(`${path}: missing 'before' field`);
    }

    return errors;
  }
}

class SequentialHandler {
  public static compare(first: SequentialRangeEntity.Type, second: SequentialRangeEntity.Type): number {
    const prefixCmp = first.prefix.localeCompare(second.prefix);

    if (prefixCmp !== 0) {
      return prefixCmp;
    }

    const result = first.minimum !== second.minimum ? first.minimum - second.minimum : first.maximum - second.maximum;
    return result;
  }

  public static createMatcher(valueDef: SequentialGroupValueEntity.Type, group: PartitionGroupInterface): SequentialMatcherInterface {
    return {
      'group': group,
      'maximum': valueDef.sequential.maximum,
      'minimum': valueDef.sequential.minimum,
      'prefix': valueDef.sequential.prefix,
      'suffix': valueDef.sequential.suffix ?? ''
    };
  }

  public static createNodeValue(valueDef: SequentialGroupValueEntity.Type): SequentialRangeEntity.Type {
    return {
      'maximum': valueDef.sequential.maximum,
      'minimum': valueDef.sequential.minimum,
      'padding': valueDef.sequential.padding,
      'prefix': valueDef.sequential.prefix,
      ...(valueDef.sequential.suffix !== undefined && { 'suffix': valueDef.sequential.suffix })
    };
  }

  public static isGroupValue(value: GroupValueEntity.Type): value is SequentialGroupValueEntity.Type {
    const result = 'sequential' in value;
    return result;
  }

  public static isNodeValue(value: unknown): value is SequentialRangeEntity.Type {
    const result = TypeGuards.isSequentialRange(value);
    return result;
  }

  public static match(matcher: SequentialMatcherInterface, _value: unknown, stringValue: string): boolean {
    if (!stringValue.startsWith(matcher.prefix) || !stringValue.endsWith(matcher.suffix)) {
      return false;
    }

    const numericPart = matcher.suffix !== ''
      ? stringValue.slice(matcher.prefix.length, -matcher.suffix.length)
      : stringValue.slice(matcher.prefix.length);
    const numericValue = parseInt(numericPart, 10);

    const result = !isNaN(numericValue) && numericValue >= matcher.minimum && numericValue <= matcher.maximum;
    return result;
  }

  public static mergeIfOverlapping(first: SequentialGroupValueEntity.Type, second: SequentialGroupValueEntity.Type): null | SequentialGroupValueEntity.Type {
    if (second.sequential.minimum > first.sequential.maximum + 1) {
      return null;
    }

    return {
      'sequential': {
        'maximum': Math.max(first.sequential.maximum, second.sequential.maximum),
        'minimum': first.sequential.minimum,
        'padding': first.sequential.padding,
        'prefix': first.sequential.prefix,
        ...(first.sequential.suffix !== undefined && { 'suffix': first.sequential.suffix })
      },
      'type': 'sequential'
    };
  }

  public static validate(valueDef: SequentialGroupValueEntity.Type, path: string): string[] {
    const errors: string[] = [];

    if (valueDef.sequential.prefix === '') {
      errors.push(`${path}: missing 'sequential.prefix' field`);
    }
    if (typeof valueDef.sequential.minimum !== 'number') {
      errors.push(`${path}: missing 'sequential.minimum' field`);
    }
    if (typeof valueDef.sequential.maximum !== 'number') {
      errors.push(`${path}: missing 'sequential.maximum' field`);
    }
    if (typeof valueDef.sequential.padding !== 'number') {
      errors.push(`${path}: missing 'sequential.padding' field`);
    }
    if (valueDef.sequential.minimum > valueDef.sequential.maximum) {
      errors.push(`${path}: sequential.minimum cannot be greater than sequential.maximum`);
    }

    return errors;
  }
}

class AlphabeticHandler {
  public static compare(first: AlphabeticRangeEntity.Type, second: AlphabeticRangeEntity.Type): number {
    const startCmp = first.start.localeCompare(second.start);

    const result = startCmp !== 0 ? startCmp : first.end.localeCompare(second.end);
    return result;
  }

  public static createMatcher(valueDef: AlphabeticGroupValueEntity.Type, group: PartitionGroupInterface): AlphabeticMatcherInterface {
    return {
      'end': valueDef.end,
      'group': group,
      'start': valueDef.start
    };
  }

  public static createNodeValue(valueDef: AlphabeticGroupValueEntity.Type): AlphabeticRangeEntity.Type {
    return {
      'end': valueDef.end,
      'start': valueDef.start
    };
  }

  public static isGroupValue(value: GroupValueEntity.Type): value is AlphabeticGroupValueEntity.Type {
    const result = 'start' in value && 'end' in value;
    return result;
  }

  public static isNodeValue(value: unknown): value is AlphabeticRangeEntity.Type {
    const result = TypeGuards.isAlphabeticRange(value);
    return result;
  }

  public static match(matcher: AlphabeticMatcherInterface, _value: unknown, stringValue: string): boolean {
    const isInRange = Predicates.performRangeComparison(stringValue, matcher.start, matcher.end, true, { 'caseSensitive': false });

    return isInRange;
  }

  public static mergeIfOverlapping(first: AlphabeticGroupValueEntity.Type, second: AlphabeticGroupValueEntity.Type): AlphabeticGroupValueEntity.Type | null {
    if (second.start.localeCompare(first.end) > 0) {
      return null;
    }

    return {
      'end': second.end.localeCompare(first.end) > 0 ? second.end : first.end,
      'start': first.start,
      'type': 'alphabetic'
    };
  }

  public static validate(valueDef: AlphabeticGroupValueEntity.Type, path: string): string[] {
    const errors: string[] = [];

    if (valueDef.start === '') {
      errors.push(`${path}: missing 'start' field`);
    }
    if (valueDef.end === '') {
      errors.push(`${path}: missing 'end' field`);
    }
    if (valueDef.start !== '' && valueDef.end !== '' && valueDef.start.localeCompare(valueDef.end) > 0) {
      errors.push(`${path}: start cannot be greater than end`);
    }

    return errors;
  }
}

const stringHandler: MatcherHandlerInterface<StringGroupValueEntity.Type, StringMatcherInterface, string> = {
  'compare': StringHandler.compare,
  'createMatcher': StringHandler.createMatcher,
  'createNodeValue': StringHandler.createNodeValue,
  'isGroupValue': StringHandler.isGroupValue,
  'isNodeValue': StringHandler.isNodeValue,
  'match': StringHandler.match,
  'supportsBinarySearch': false,
  'type': 'string',
  'validate': StringHandler.validate
};

const rangeHandler: MatcherHandlerInterface<RangeGroupValueEntity.Type, RangeMatcherInterface, RangeEntity.Type> = {
  'compare': RangeHandler.compare,
  'createMatcher': RangeHandler.createMatcher,
  'createNodeValue': RangeHandler.createNodeValue,
  'getSortKey': RangeHandler.getSortKey,
  'isGroupValue': RangeHandler.isGroupValue,
  'isNodeValue': RangeHandler.isNodeValue,
  'match': RangeHandler.match,
  'supportsBinarySearch': true,
  'type': 'range',
  'validate': RangeHandler.validate
};

const cidrHandler: MatcherHandlerInterface<CidrGroupValueEntity.Type, CidrMatcherInterface, CidrRangeEntity.Type> = {
  'compare': CidrHandler.compare,
  'createMatcher': CidrHandler.createMatcher,
  'createNodeValue': CidrHandler.createNodeValue,
  'isGroupValue': CidrHandler.isGroupValue,
  'isNodeValue': CidrHandler.isNodeValue,
  'match': CidrHandler.match,
  'supportsBinarySearch': false,
  'type': 'cidr',
  'validate': CidrHandler.validate
};

const semverHandler: MatcherHandlerInterface<SemverGroupValueEntity.Type, SemverMatcherInterface, SemverRangeEntity.Type> = {
  'compare': SemverHandler.compare,
  'createMatcher': SemverHandler.createMatcher,
  'createNodeValue': SemverHandler.createNodeValue,
  'isGroupValue': SemverHandler.isGroupValue,
  'isNodeValue': SemverHandler.isNodeValue,
  'match': SemverHandler.match,
  'supportsBinarySearch': false,
  'type': 'semver',
  'validate': SemverHandler.validate
};

const dateHandler: MatcherHandlerInterface<DateGroupValueEntity.Type, DateMatcherInterface, DateRangeEntity.Type> = {
  'compare': DateHandler.compare,
  'createMatcher': DateHandler.createMatcher,
  'createNodeValue': DateHandler.createNodeValue,
  'getSortKey': DateHandler.getSortKey,
  'isGroupValue': DateHandler.isGroupValue,
  'isNodeValue': DateHandler.isNodeValue,
  'match': DateHandler.match,
  'supportsBinarySearch': true,
  'type': 'date',
  'validate': DateHandler.validate
};

export const sequentialHandler: MatcherHandlerInterface<SequentialGroupValueEntity.Type, SequentialMatcherInterface, SequentialRangeEntity.Type> = {
  'compare': SequentialHandler.compare,
  'createMatcher': SequentialHandler.createMatcher,
  'createNodeValue': SequentialHandler.createNodeValue,
  'isGroupValue': SequentialHandler.isGroupValue,
  'isNodeValue': SequentialHandler.isNodeValue,
  'match': SequentialHandler.match,
  'mergeIfOverlapping': SequentialHandler.mergeIfOverlapping,
  'supportsBinarySearch': false,
  'type': 'sequential',
  'validate': SequentialHandler.validate
};

export const alphabeticHandler: MatcherHandlerInterface<AlphabeticGroupValueEntity.Type, AlphabeticMatcherInterface, AlphabeticRangeEntity.Type> = {
  'compare': AlphabeticHandler.compare,
  'createMatcher': AlphabeticHandler.createMatcher,
  'createNodeValue': AlphabeticHandler.createNodeValue,
  'isGroupValue': AlphabeticHandler.isGroupValue,
  'isNodeValue': AlphabeticHandler.isNodeValue,
  'match': AlphabeticHandler.match,
  'mergeIfOverlapping': AlphabeticHandler.mergeIfOverlapping,
  'supportsBinarySearch': false,
  'type': 'alphabetic',
  'validate': AlphabeticHandler.validate
};

class MatcherRegistryBuilder {
  static buildByType(): Record<GroupValueDiscriminantEntity.Type, MatcherHandlerInterface> {
    return {
      'alphabetic': alphabeticHandler,
      'cidr': cidrHandler,
      'date': dateHandler,
      'range': rangeHandler,
      'semver': semverHandler,
      'sequential': sequentialHandler,
      'string': stringHandler
    };
  }

  static buildOrdered(): MatcherHandlerInterface[] {
    return [
      stringHandler,
      sequentialHandler,
      rangeHandler,
      cidrHandler,
      semverHandler,
      dateHandler,
      alphabeticHandler
    ];
  }
}

/**
 * Ordered list (by specificity, to avoid false positive matches between types that share
 * similar field structures) and by-type lookup of every matcher handler.
 */
export const matcherRegistry = { 'byType': MatcherRegistryBuilder.buildByType(), 'ordered': MatcherRegistryBuilder.buildOrdered() };

/**
 * Looks up matcher handlers for group and node values.
 */
export class MatcherHandlerLookup {
  /**
   * Finds the appropriate matcher handler for a GroupValueEntity.Type based on its structure.
   * @param value - The group value definition to find a handler for
   * @returns The matching handler, or null if no handler supports this value type
   */
  static findMatcherHandler(value: GroupValueEntity.Type): MatcherHandlerInterface | null {
    for (let index = 0; index < matcherRegistry.ordered.length; index++) {
      const handler = matcherRegistry.ordered[index]!;

      if (handler.isGroupValue(value)) {
        return handler;
      }
    }

    return null;
  }

  /**
   * Finds the appropriate matcher handler for a node value based on its structure.
   * @param value - The node value (from GroupNodeInterface.value) to find a handler for
   * @returns The matching handler, or null if no handler recognizes this value type
   */
  static findNodeValueHandler(value: unknown): MatcherHandlerInterface | null {
    for (let index = 0; index < matcherRegistry.ordered.length; index++) {
      const handler = matcherRegistry.ordered[index]!;

      if (handler.isNodeValue(value)) {
        return handler;
      }
    }

    return null;
  }

  /**
   * Merges adjacent or overlapping group values into consolidated ranges where possible.
   * @param values - Sorted array of group values to merge
   * @param handler - The matcher handler for the value type (must implement mergeIfOverlapping)
   * @returns Array of merged values with overlapping ranges combined
   */
  static mergeOverlappingValues<T extends GroupValueEntity.Type>(values: T[], handler: MatcherHandlerInterface<T>): T[] {
    if (values.length === 0 || handler.mergeIfOverlapping === undefined) {
      return values;
    }

    const merged: T[] = [];
    let current = values[0]!;

    for (let index = 1; index < values.length; index++) {
      const next = values[index]!;
      const mergeResult = handler.mergeIfOverlapping(current, next);

      if (mergeResult !== null) {
        current = mergeResult;
      }
      else {
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);

    return merged;
  }
}
