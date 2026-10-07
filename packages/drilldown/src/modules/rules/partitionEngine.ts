
import { Predicates } from '#runtime';

import type { GroupRuleEntity } from '../../entities/GroupRuleEntity.js';
import type { GroupValueDiscriminantEntity } from '../../entities/GroupValueDiscriminantEntity.js';
import type { GroupValueEntity } from '../../entities/GroupValueEntity.js';
import type {
  MatchContextInterface,
  MatcherHandlerInterface,
  PartitionGroupInterface
} from '../../interfaces/index.js';
import type { MatcherUnionType } from '../../types/index.js';

import { DrilldownUtilities } from '../DrilldownUtilities.js';
import {
  MatcherHandlerLookup,
  matcherRegistry
} from '../matchers/index.js';
import { valueConverter } from './valueConverter.js';

class ExclusiveMatcherType {
  static get(matchersByType: Map<GroupValueDiscriminantEntity.Type, MatcherUnionType[]>): GroupValueDiscriminantEntity.Type | null {
    let exclusiveType: GroupValueDiscriminantEntity.Type | null = null;

    for (const [
      type,
      matchers
    ] of matchersByType) {
      if (matchers.length > 0) {
        if (exclusiveType !== null) {
          return null;
        }
        exclusiveType = type;
      }
    }

    return exclusiveType;
  }
}

class MatcherOrdering {
  static checkSortedByKey(matchers: MatcherUnionType[], getSortKey: (m: MatcherUnionType) => number): boolean {
    if (matchers.length <= 1) {
      return true;
    }

    for (let i = 1; i < matchers.length; i++) {
      const previous = matchers[i - 1]!;
      const current = matchers[i]!;

      if (getSortKey(previous) > getSortKey(current)) {
        return false;
      }
    }

    return true;
  }
}

/** Output of {@link PartitionIndexBuilder.build}: matched groups plus per-type matcher/handler lookups. */
interface PartitionMatcherIndexInterface {
  'handlersByType': Map<GroupValueDiscriminantEntity.Type, MatcherHandlerInterface>
  'matched': PartitionGroupInterface[]
  'matchersByType': Map<GroupValueDiscriminantEntity.Type, MatcherUnionType[]>
  'stringMatcherMap': Map<string, PartitionGroupInterface>
}

interface PartitionResultInterface {
  'matched': PartitionGroupInterface[]
  'ungroupable': Record<string, unknown>[]
}

/** Bundled state for partitioning data against one exclusively-selected matcher type. */
interface SingleHandlerPartitionInterface {
  'context': MatchContextInterface
  'handler': MatcherHandlerInterface
  'matched': PartitionGroupInterface[]
  'matchers': MatcherUnionType[]
  'property': string
}

/** Handler/context/sort-key lookup needed to test one candidate value against a sorted matcher run. */
interface BinarySearchLookupInterface {
  'context': MatchContextInterface
  'exclusiveType': GroupValueDiscriminantEntity.Type
  'getSortKey': (matcher: MatcherUnionType) => number
  'handler': MatcherHandlerInterface
}

/** {@link SingleHandlerPartitionInterface} plus the sort key needed for binary search. */
interface BinarySearchPartitionInterface extends BinarySearchLookupInterface, SingleHandlerPartitionInterface {}

/** Builds the per-type matcher/handler index from a group rule's configured values. */
class PartitionIndexBuilder {
  static build(groupValues: GroupValueEntity.Type[]): PartitionMatcherIndexInterface {
    const matched: PartitionGroupInterface[] = [];
    const matchersByType = new Map<GroupValueDiscriminantEntity.Type, MatcherUnionType[]>([
      ['alphabetic', []],
      ['cidr', []],
      ['date', []],
      ['range', []],
      ['semver', []],
      ['sequential', []],
      ['string', []]
    ]);
    const handlersByType = new Map<GroupValueDiscriminantEntity.Type, MatcherHandlerInterface>();
    const stringMatcherMap = new Map<string, PartitionGroupInterface>();

    for (let valueIndex = 0; valueIndex < groupValues.length; valueIndex++) {
      const valueDef = groupValues[valueIndex]!;
      PartitionIndexBuilder.indexValue(valueDef, matched, matchersByType, handlersByType, stringMatcherMap);
    }

    return {
      'handlersByType': handlersByType,
      'matched': matched,
      'matchersByType': matchersByType,
      'stringMatcherMap': stringMatcherMap
    };
  }

  private static indexValue(
    valueDef: GroupValueEntity.Type,
    matched: PartitionGroupInterface[],
    matchersByType: Map<GroupValueDiscriminantEntity.Type, MatcherUnionType[]>,
    handlersByType: Map<GroupValueDiscriminantEntity.Type, MatcherHandlerInterface>,
    stringMatcherMap: Map<string, PartitionGroupInterface>
  ): void {
    const handler = MatcherHandlerLookup.findMatcherHandler(valueDef);

    if (handler === null) {
      matched.push({
        'groupValue': valueDef,
        'nodes': [],
        'nodeValue': null
      });
      return;
    }

    const nodeValue = handler.createNodeValue(valueDef);
    const group: PartitionGroupInterface = {
      'groupValue': valueDef,
      'nodes': [],
      'nodeValue': nodeValue
    };

    matched.push(group);
    handlersByType.set(handler.type, handler);

    const matcher = handler.createMatcher(valueDef, group);

    if (matcher !== null) {
      const typeMatchers = matchersByType.get(handler.type);

      if (typeMatchers !== undefined) {
        typeMatchers.push(matcher);
      }

      if (handler.type === 'string' && 'match' in matcher) {
        stringMatcherMap.set(matcher.match, group);
      }
    }
  }
}

/** Executes partitioning against a built matcher index, one phase per matching strategy. */
class PartitionExecutor {
  static run(data: Record<string, unknown>[], groupConfig: GroupRuleEntity.Type): PartitionResultInterface {
    if (groupConfig.values === undefined || groupConfig.values.length === 0) {
      return { 'matched': [], 'ungroupable': data };
    }

    const property = groupConfig.property;
    const index = PartitionIndexBuilder.build(groupConfig.values);
    const context: MatchContextInterface = {
      'toDateTimestamp': valueConverter.toDateTimestamp,
      'toStrictNumber': valueConverter.toStrictNumber
    };
    const exclusiveType = ExclusiveMatcherType.get(index.matchersByType);

    if (exclusiveType !== null) {
      const result = PartitionExecutor.runExclusive(data, property, exclusiveType, index, context);
      return result;
    }

    const result = PartitionExecutor.runMultiHandler(data, property, index, context);
    return result;
  }

  private static runExclusive(
    data: Record<string, unknown>[],
    property: string,
    exclusiveType: GroupValueDiscriminantEntity.Type,
    index: PartitionMatcherIndexInterface,
    context: MatchContextInterface
  ): PartitionResultInterface {
    const handler = index.handlersByType.get(exclusiveType);
    const matchers = index.matchersByType.get(exclusiveType);

    if (handler === undefined || matchers === undefined) {
      return { 'matched': index.matched, 'ungroupable': [] };
    }

    if (exclusiveType === 'string') {
      const result = PartitionExecutor.runStringExclusive(data, property, index.matched, index.stringMatcherMap);
      return result;
    }

    if (handler.supportsBinarySearch && handler.getSortKey !== undefined) {
      const result = PartitionExecutor.runBinarySearch(data, {
        'context': context,
        'exclusiveType': exclusiveType,
        'getSortKey': handler.getSortKey,
        'handler': handler,
        'matched': index.matched,
        'matchers': matchers,
        'property': property
      });
      return result;
    }

    const result = PartitionExecutor.runLinearSingleHandler(data, {
      'context': context,
      'handler': handler,
      'matched': index.matched,
      'matchers': matchers,
      'property': property
    });
    return result;
  }

  private static runStringExclusive(
    data: Record<string, unknown>[],
    property: string,
    matched: PartitionGroupInterface[],
    stringMatcherMap: Map<string, PartitionGroupInterface>
  ): PartitionResultInterface {
    const ungroupable: Record<string, unknown>[] = [];

    for (let index = 0; index < data.length; index++) {
      const item = data[index]!;
      const value = DrilldownUtilities.getPropertyValue(item, property);

      if (Predicates.isNullish(value)) {
        ungroupable.push(item);
        continue;
      }

      const group = stringMatcherMap.get(String(value));

      if (group !== undefined) {
        group.nodes.push(item);
      }
      else {
        ungroupable.push(item);
      }
    }

    return { 'matched': matched, 'ungroupable': ungroupable };
  }

  private static runBinarySearch(data: Record<string, unknown>[], bundle: BinarySearchPartitionInterface): PartitionResultInterface {
    const { context, exclusiveType, getSortKey, handler, matched, property } = bundle;
    const matchers = MatcherOrdering.checkSortedByKey(bundle.matchers, getSortKey)
      ? bundle.matchers
      : bundle.matchers.toSorted((first, second) => { const result = getSortKey(first) - getSortKey(second);
        return result; });
    const ungroupable: Record<string, unknown>[] = [];

    for (let dataIndex = 0; dataIndex < data.length; dataIndex++) {
      const item = data[dataIndex]!;
      const value = DrilldownUtilities.getPropertyValue(item, property);

      if (Predicates.isNullish(value)) {
        ungroupable.push(item);
        continue;
      }

      const wasMatched = PartitionExecutor.binarySearchMatch(item, value, matchers, { 'context': context, 'exclusiveType': exclusiveType, 'getSortKey': getSortKey, 'handler': handler });

      if (!wasMatched) {
        ungroupable.push(item);
      }
    }

    return { 'matched': matched, 'ungroupable': ungroupable };
  }

  private static binarySearchMatch(
    item: Record<string, unknown>,
    value: unknown,
    matchers: MatcherUnionType[],
    lookup: BinarySearchLookupInterface
  ): boolean {
    const { context, exclusiveType, getSortKey, handler } = lookup;
    const stringValue = String(value);
    let low = 0;
    let high = matchers.length - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const matcher = matchers[mid]!;

      if (handler.match(matcher, value, stringValue, context)) {
        matcher.group.nodes.push(item);
        return true;
      }

      const sortKey = getSortKey(matcher);
      const testValue = exclusiveType === 'range'
        ? (context.toDateTimestamp(value) ?? context.toStrictNumber(value))
        : context.toDateTimestamp(value);

      if (testValue !== null && testValue < sortKey) {
        high = mid - 1;
      }
      else {
        low = mid + 1;
      }
    }

    return false;
  }

  private static runLinearSingleHandler(data: Record<string, unknown>[], bundle: SingleHandlerPartitionInterface): PartitionResultInterface {
    const { context, handler, matched, matchers, property } = bundle;
    const ungroupable: Record<string, unknown>[] = [];

    for (let dataIndex = 0; dataIndex < data.length; dataIndex++) {
      const item = data[dataIndex]!;
      const value = DrilldownUtilities.getPropertyValue(item, property);

      if (Predicates.isNullish(value)) {
        ungroupable.push(item);
        continue;
      }

      const stringValue = String(value);
      let wasMatched = false;

      for (let matcherIndex = 0; matcherIndex < matchers.length; matcherIndex++) {
        const matcher = matchers[matcherIndex]!;

        if (handler.match(matcher, value, stringValue, context)) {
          matcher.group.nodes.push(item);
          wasMatched = true;
          break;
        }
      }

      if (!wasMatched) {
        ungroupable.push(item);
      }
    }

    return { 'matched': matched, 'ungroupable': ungroupable };
  }

  private static runMultiHandler(
    data: Record<string, unknown>[],
    property: string,
    index: PartitionMatcherIndexInterface,
    context: MatchContextInterface
  ): PartitionResultInterface {
    const activeHandlers: { 'handler': MatcherHandlerInterface
      'matchers': MatcherUnionType[] }[] = [];

    for (let handlerIndex = 0; handlerIndex < matcherRegistry.ordered.length; handlerIndex++) {
      const handler = matcherRegistry.ordered[handlerIndex]!;
      const matchers = index.matchersByType.get(handler.type);

      if (matchers !== undefined && matchers.length > 0) {
        activeHandlers.push({
          'handler': handler,
          'matchers': matchers
        });
      }
    }

    const ungroupable: Record<string, unknown>[] = [];

    for (let dataIndex = 0; dataIndex < data.length; dataIndex++) {
      const item = data[dataIndex]!;
      const value = DrilldownUtilities.getPropertyValue(item, property);

      if (Predicates.isNullish(value)) {
        ungroupable.push(item);
        continue;
      }

      const wasMatched = PartitionExecutor.matchAgainstActiveHandlers(item, value, activeHandlers, index.stringMatcherMap, context);

      if (!wasMatched) {
        ungroupable.push(item);
      }
    }

    return { 'matched': index.matched, 'ungroupable': ungroupable };
  }

  private static matchAgainstActiveHandlers(
    item: Record<string, unknown>,
    value: unknown,
    activeHandlers: { 'handler': MatcherHandlerInterface, 'matchers': MatcherUnionType[] }[],
    stringMatcherMap: Map<string, PartitionGroupInterface>,
    context: MatchContextInterface
  ): boolean {
    const stringValue = String(value);

    if (stringMatcherMap.size > 0) {
      const group = stringMatcherMap.get(stringValue);

      if (group !== undefined) {
        group.nodes.push(item);
        return true;
      }
    }

    for (let handlerIndex = 0; handlerIndex < activeHandlers.length; handlerIndex++) {
      const { handler, matchers } = activeHandlers[handlerIndex]!;

      if (handler.type === 'string') {
        continue;
      }

      for (let matcherIndex = 0; matcherIndex < matchers.length; matcherIndex++) {
        const matcher = matchers[matcherIndex]!;

        if (handler.match(matcher, value, stringValue, context)) {
          matcher.group.nodes.push(item);
          return true;
        }
      }
    }

    return false;
  }
}

/**
 * Partitions data records into groups based on group rules.
 */
export const partitionEngine = {
  /**
   * Partitions data by property according to group rules.
   * @param data - Array of data records to partition
   * @param groupConfig - Group rule defining property and values
   * @returns Object with matched groups and ungroupable records
   */
  'partitionByProperty': PartitionExecutor.run
};
