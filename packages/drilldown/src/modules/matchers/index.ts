import { Predicates } from '@studnicky/types';

import type { AlphabeticRangeEntity } from '../../entities/AlphabeticRangeEntity.js';
import type { CidrRangeEntity } from '../../entities/CidrRangeEntity.js';
import type { DateRangeEntity } from '../../entities/DateRangeEntity.js';
import type { GroupValueDiscriminantEntity } from '../../entities/GroupValueDiscriminantEntity.js';
import type { RangeEntity } from '../../entities/RangeEntity.js';
import type { SemverRangeEntity } from '../../entities/SemverRangeEntity.js';
import type { SequentialRangeEntity } from '../../entities/SequentialRangeEntity.js';
import type {
  AlphabeticGroupValueInterface,
  CidrGroupValueInterface,
  DateGroupValueInterface,
  RangeGroupValueInterface,
  SemverGroupValueInterface,
  SequentialGroupValueInterface,
  StringGroupValueInterface
} from '../../interfaces/GroupValueInterface.js';
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
import type { GroupValueUnionType } from '../../types/index.js';

import { DRILLDOWN_DEFAULTS } from '../../constants/index.js';
import { TypeGuards } from '../../typeguards/index.js';
import { DrilldownUtilities } from '../DrilldownUtilities.js';

const stringHandler: MatcherHandlerInterface<StringGroupValueInterface, StringMatcherInterface, string> = {
  'compare': function (first: string, second: string): number {
    const result = first.localeCompare(second);
    return result;
  },
  'createMatcher': function (valueDef: StringGroupValueInterface, group: PartitionGroupInterface): StringMatcherInterface {
    return {
      'group': group,
      'match': valueDef.match
    };
  },

  'createNodeValue': function (valueDef: StringGroupValueInterface): string {
    const result = valueDef.match;
    return result;
  },

  'isGroupValue': function (value: GroupValueUnionType): value is StringGroupValueInterface {
    const result = 'match' in value;
    return result;
  },

  'isNodeValue': function (value: unknown): value is string {
    const result = Predicates.isString(value);
    return result;
  },

  'match': function (matcher: StringMatcherInterface, _value: unknown, stringValue: string): boolean {
    const result = stringValue === matcher.match;
    return result;
  },

  'supportsBinarySearch': false,

  'type': 'string',

  'validate': function (valueDef: StringGroupValueInterface, path: string): string[] {
    const errors: string[] = [];

    if (valueDef.match === '') {
      errors.push(`${path}: missing 'match' field`);
    }

    return errors;
  }
};

const rangeHandler: MatcherHandlerInterface<RangeGroupValueInterface, RangeMatcherInterface, RangeEntity.Type> = {
  'compare': function (first: RangeEntity.Type, second: RangeEntity.Type): number {
    const result = first.minimum !== second.minimum ? first.minimum - second.minimum : first.maximum - second.maximum;
    return result;
  },
  'createMatcher': function (valueDef: RangeGroupValueInterface, group: PartitionGroupInterface): RangeMatcherInterface {
    return {
      'group': group,
      'maximum': valueDef.maximum,
      'minimum': valueDef.minimum
    };
  },

  'createNodeValue': function (valueDef: RangeGroupValueInterface): RangeEntity.Type {
    return {
      'maximum': valueDef.maximum,
      'minimum': valueDef.minimum
    };
  },

  'getSortKey': function (matcher: RangeMatcherInterface): number {
    const result = matcher.minimum;
    return result;
  },

  'isGroupValue': function (value: GroupValueUnionType): value is RangeGroupValueInterface {
    const result = 'minimum' in value && 'maximum' in value && !('sequential' in value);
    return result;
  },

  'isNodeValue': TypeGuards.isRange,

  'match': function (matcher: RangeMatcherInterface, value: unknown, _stringValue: string, context: MatchContextInterface): boolean {
    const numericValue = context.toDateTimestamp(value) ?? context.toStrictNumber(value);

    if (numericValue === null) {
      return false;
    }

    const result = numericValue >= matcher.minimum && numericValue < matcher.maximum;
    return result;
  },

  'supportsBinarySearch': true,

  'type': 'range',

  'validate': function (valueDef: RangeGroupValueInterface, path: string): string[] {
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
};

const cidrHandler: MatcherHandlerInterface<CidrGroupValueInterface, CidrMatcherInterface, CidrRangeEntity.Type> = {
  'compare': function (first: CidrRangeEntity.Type, second: CidrRangeEntity.Type): number {
    const rangeFirst = DrilldownUtilities.parseCidr(first.cidr);
    const rangeSecond = DrilldownUtilities.parseCidr(second.cidr);

    if (rangeFirst === null && rangeSecond === null) {
      return 0;
    }
    if (rangeFirst === null) {
      return 1;
    }
    if (rangeSecond === null) {
      const result = -1;
      return result;
    }

    const result = rangeFirst.start !== rangeSecond.start ? rangeFirst.start - rangeSecond.start : rangeFirst.end - rangeSecond.end;
    return result;
  },
  'createMatcher': function (valueDef: CidrGroupValueInterface, group: PartitionGroupInterface): CidrMatcherInterface | null {
    const range = DrilldownUtilities.parseCidr(valueDef.cidr);

    if (range === null) {
      return null;
    }

    return {
      'end': range.end,
      'group': group,
      'start': range.start
    };
  },

  'createNodeValue': function (valueDef: CidrGroupValueInterface): CidrRangeEntity.Type {
    return { 'cidr': valueDef.cidr };
  },

  'isGroupValue': function (value: GroupValueUnionType): value is CidrGroupValueInterface {
    const result = 'cidr' in value;
    return result;
  },

  'isNodeValue': TypeGuards.isCidrRange,

  'match': function (matcher: CidrMatcherInterface, _value: unknown, stringValue: string): boolean {
    const ipNumber = DrilldownUtilities.ipToNumber(stringValue);

    if (ipNumber === null) {
      return false;
    }

    const result = ipNumber >= matcher.start && ipNumber <= matcher.end;
    return result;
  },

  'supportsBinarySearch': false,

  'type': 'cidr',

  'validate': function (valueDef: CidrGroupValueInterface, path: string): string[] {
    const errors: string[] = [];

    if (valueDef.cidr === '') {
      errors.push(`${path}: missing 'cidr' field`);
    }
    else if (DrilldownUtilities.parseCidr(valueDef.cidr) === null) {
      errors.push(`${path}: invalid CIDR notation '${valueDef.cidr}'`);
    }

    return errors;
  }
};

const semverHandler: MatcherHandlerInterface<SemverGroupValueInterface, SemverMatcherInterface, SemverRangeEntity.Type> = {
  'compare': function (first: SemverRangeEntity.Type, second: SemverRangeEntity.Type): number {
    const firstVersion = first.semver.replace(DRILLDOWN_DEFAULTS.semverPrefixPattern, '');
    const secondVersion = second.semver.replace(DRILLDOWN_DEFAULTS.semverPrefixPattern, '');

    const result = DrilldownUtilities.compareSemver(firstVersion, secondVersion);
    return result;
  },
  'createMatcher': function (valueDef: SemverGroupValueInterface, group: PartitionGroupInterface): SemverMatcherInterface {
    return {
      'group': group,
      'range': valueDef.semver
    };
  },

  'createNodeValue': function (valueDef: SemverGroupValueInterface): SemverRangeEntity.Type {
    return { 'semver': valueDef.semver };
  },

  'isGroupValue': function (value: GroupValueUnionType): value is SemverGroupValueInterface {
    const result = 'semver' in value;
    return result;
  },

  'isNodeValue': TypeGuards.isSemverRange,

  'match': function (matcher: SemverMatcherInterface, _value: unknown, stringValue: string): boolean {
    const result = DrilldownUtilities.semverSatisfies(stringValue, matcher.range);
    return result;
  },

  'supportsBinarySearch': false,

  'type': 'semver',

  'validate': function (valueDef: SemverGroupValueInterface, path: string): string[] {
    const errors: string[] = [];

    if (valueDef.semver === '') {
      errors.push(`${path}: missing 'semver' field`);
    }

    return errors;
  }
};

const dateHandler: MatcherHandlerInterface<DateGroupValueInterface, DateMatcherInterface, DateRangeEntity.Type> = {
  'compare': function (first: DateRangeEntity.Type, second: DateRangeEntity.Type): number {
    const afterDiff = first.after - second.after;

    if (afterDiff !== 0) {
      return afterDiff;
    }

    const result = first.before - second.before;
    return result;
  },
  'createMatcher': function (valueDef: DateGroupValueInterface, group: PartitionGroupInterface): DateMatcherInterface {
    return {
      'afterTs': valueDef.after,
      'beforeTs': valueDef.before,
      'group': group
    };
  },

  'createNodeValue': function (valueDef: DateGroupValueInterface): DateRangeEntity.Type {
    return {
      'after': valueDef.after,
      'before': valueDef.before
    };
  },

  'getSortKey': function (matcher: DateMatcherInterface): number {
    const result = matcher.afterTs;
    return result;
  },

  'isGroupValue': function (value: GroupValueUnionType): value is DateGroupValueInterface {
    const result = 'after' in value && 'before' in value;
    return result;
  },

  'isNodeValue': TypeGuards.isDateRange,

  'match': function (matcher: DateMatcherInterface, value: unknown, _stringValue: string, context: MatchContextInterface): boolean {
    const dateValue = context.toDateTimestamp(value);

    if (dateValue === null) {
      return false;
    }

    const result = dateValue >= matcher.afterTs && dateValue < matcher.beforeTs;
    return result;
  },

  'supportsBinarySearch': true,

  'type': 'date',

  'validate': function (valueDef: DateGroupValueInterface, path: string): string[] {
    const errors: string[] = [];

    if (!Number.isFinite(valueDef.after)) {
      errors.push(`${path}: missing 'after' field`);
    }
    if (!Number.isFinite(valueDef.before)) {
      errors.push(`${path}: missing 'before' field`);
    }

    return errors;
  }
};

const sequentialHandler: MatcherHandlerInterface<SequentialGroupValueInterface, SequentialMatcherInterface, SequentialRangeEntity.Type> = {
  'compare': function (first: SequentialRangeEntity.Type, second: SequentialRangeEntity.Type): number {
    const prefixCmp = first.prefix.localeCompare(second.prefix);

    if (prefixCmp !== 0) {
      return prefixCmp;
    }

    const result = first.minimum !== second.minimum ? first.minimum - second.minimum : first.maximum - second.maximum;
    return result;
  },
  'createMatcher': function (valueDef: SequentialGroupValueInterface, group: PartitionGroupInterface): SequentialMatcherInterface {
    return {
      'group': group,
      'maximum': valueDef.sequential.maximum,
      'minimum': valueDef.sequential.minimum,
      'prefix': valueDef.sequential.prefix,
      'suffix': valueDef.sequential.suffix ?? ''
    };
  },

  'createNodeValue': function (valueDef: SequentialGroupValueInterface): SequentialRangeEntity.Type {
    return {
      'maximum': valueDef.sequential.maximum,
      'minimum': valueDef.sequential.minimum,
      'padding': valueDef.sequential.padding,
      'prefix': valueDef.sequential.prefix,
      ...(valueDef.sequential.suffix !== undefined && { 'suffix': valueDef.sequential.suffix })
    };
  },

  'isGroupValue': function (value: GroupValueUnionType): value is SequentialGroupValueInterface {
    const result = 'sequential' in value;
    return result;
  },

  'isNodeValue': TypeGuards.isSequentialRange,

  'match': function (matcher: SequentialMatcherInterface, _value: unknown, stringValue: string): boolean {
    if (!stringValue.startsWith(matcher.prefix) || !stringValue.endsWith(matcher.suffix)) {
      return false;
    }

    const numericPart = matcher.suffix !== ''
      ? stringValue.slice(matcher.prefix.length, -matcher.suffix.length)
      : stringValue.slice(matcher.prefix.length);
    const numericValue = parseInt(numericPart, 10);

    const result = !isNaN(numericValue) && numericValue >= matcher.minimum && numericValue <= matcher.maximum;
    return result;
  },

  'mergeIfOverlapping': function (first: SequentialGroupValueInterface, second: SequentialGroupValueInterface): null | SequentialGroupValueInterface {
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
  },

  'supportsBinarySearch': false,

  'type': 'sequential',

  'validate': function (valueDef: SequentialGroupValueInterface, path: string): string[] {
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
};

const alphabeticHandler: MatcherHandlerInterface<AlphabeticGroupValueInterface, AlphabeticMatcherInterface, AlphabeticRangeEntity.Type> = {
  'compare': function (first: AlphabeticRangeEntity.Type, second: AlphabeticRangeEntity.Type): number {
    const startCmp = first.start.localeCompare(second.start);

    const result = startCmp !== 0 ? startCmp : first.end.localeCompare(second.end);
    return result;
  },
  'createMatcher': function (valueDef: AlphabeticGroupValueInterface, group: PartitionGroupInterface): AlphabeticMatcherInterface {
    return {
      'end': valueDef.end,
      'group': group,
      'start': valueDef.start
    };
  },

  'createNodeValue': function (valueDef: AlphabeticGroupValueInterface): AlphabeticRangeEntity.Type {
    return {
      'end': valueDef.end,
      'start': valueDef.start
    };
  },

  'isGroupValue': function (value: GroupValueUnionType): value is AlphabeticGroupValueInterface {
    const result = 'start' in value && 'end' in value;
    return result;
  },

  'isNodeValue': TypeGuards.isAlphabeticRange,

  'match': function (matcher: AlphabeticMatcherInterface, _value: unknown, stringValue: string): boolean {
    const isInRange = DrilldownUtilities.stringInAlphabeticRange(stringValue, matcher.start, matcher.end);

    return isInRange;
  },

  'mergeIfOverlapping': function (first: AlphabeticGroupValueInterface, second: AlphabeticGroupValueInterface): AlphabeticGroupValueInterface | null {
    if (second.start.localeCompare(first.end) > 0) {
      return null;
    }

    return {
      'end': second.end.localeCompare(first.end) > 0 ? second.end : first.end,
      'start': first.start,
      'type': 'alphabetic'
    };
  },

  'supportsBinarySearch': false,

  'type': 'alphabetic',

  'validate': function (valueDef: AlphabeticGroupValueInterface, path: string): string[] {
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
};

/**
 * Ordered list (by specificity, to avoid false positive matches between types that share
 * similar field structures) and by-type lookup of every matcher handler.
 */
export const matcherRegistry = {
  'byType': {
    'alphabetic': alphabeticHandler,
    'cidr': cidrHandler,
    'date': dateHandler,
    'range': rangeHandler,
    'semver': semverHandler,
    'sequential': sequentialHandler,
    'string': stringHandler
  } as Record<GroupValueDiscriminantEntity.Type, MatcherHandlerInterface>,
  'ordered': [
    stringHandler,
    sequentialHandler,
    rangeHandler,
    cidrHandler,
    semverHandler,
    dateHandler,
    alphabeticHandler
  ] as MatcherHandlerInterface[]
};

/**
 * Looks up matcher handlers for group and node values.
 */
export class MatcherHandlerLookup {
  /**
   * Finds the appropriate matcher handler for a GroupValueUnionType based on its structure.
   * @param value - The group value definition to find a handler for
   * @returns The matching handler, or null if no handler supports this value type
   */
  static findMatcherHandler(value: GroupValueUnionType): MatcherHandlerInterface | null {
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
  static mergeOverlappingValues<T extends GroupValueUnionType>(values: T[], handler: MatcherHandlerInterface<T>): T[] {
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
