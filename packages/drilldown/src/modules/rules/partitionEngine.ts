import { Predicates } from '@studnicky/types';

import type { GroupValueDiscriminantEntity } from '../../entities/GroupValueDiscriminantEntity.js';
import type { GroupRuleInterface } from '../../interfaces/GroupValueInterface.js';
import type {
  DataRecordInterface,
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
  'partitionByProperty': function (
    data: DataRecordInterface[],
    groupConfig: GroupRuleInterface
  ): { 'matched': PartitionGroupInterface[]
    'ungroupable': DataRecordInterface[] } {
    const matched: PartitionGroupInterface[] = [];
    const ungroupable: DataRecordInterface[] = [];
    const property = groupConfig.property;

    if (groupConfig.values === undefined || groupConfig.values.length === 0) {
      return {
        'matched': matched,
        'ungroupable': data
      };
    }

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

    const groupValues = groupConfig.values;

    for (let valueIndex = 0; valueIndex < groupValues.length; valueIndex++) {
      const valueDef = groupValues[valueIndex]!;
      const handler = MatcherHandlerLookup.findMatcherHandler(valueDef);

      if (handler === null) {
        matched.push({
          'groupValue': valueDef,
          'nodes': [],
          'nodeValue': null
        });
        continue;
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

    const context: MatchContextInterface = {
      'toDateTimestamp': valueConverter.toDateTimestamp,
      'toStrictNumber': valueConverter.toStrictNumber
    };

    const exclusiveType = ExclusiveMatcherType.get(matchersByType);

    if (exclusiveType !== null) {
      const handler = handlersByType.get(exclusiveType);
      let matchers = matchersByType.get(exclusiveType);

      if (handler === undefined || matchers === undefined) {
        return {
          'matched': matched,
          'ungroupable': ungroupable
        };
      }

      if (exclusiveType === 'string') {
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

        return {
          'matched': matched,
          'ungroupable': ungroupable
        };
      }

      if (handler.supportsBinarySearch && handler.getSortKey !== undefined) {
        const getSortKey = handler.getSortKey;

        if (!MatcherOrdering.checkSortedByKey(matchers, getSortKey)) {
          matchers = matchers.toSorted((first, second) => { const result = getSortKey(first) - getSortKey(second);
            return result; });
        }

        for (let dataIndex = 0; dataIndex < data.length; dataIndex++) {
          const item = data[dataIndex]!;
          const value = DrilldownUtilities.getPropertyValue(item, property);

          if (Predicates.isNullish(value)) {
            ungroupable.push(item);
            continue;
          }

          const stringValue = String(value);
          let wasMatched = false;
          let low = 0;
          let high = matchers.length - 1;

          while (low <= high) {
            const mid = (low + high) >>> 1;
            const matcher = matchers[mid]!;

            if (handler.match(matcher, value, stringValue, context)) {
              matcher.group.nodes.push(item);
              wasMatched = true;
              break;
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

          if (!wasMatched) {
            ungroupable.push(item);
          }
        }

        return {
          'matched': matched,
          'ungroupable': ungroupable
        };
      }

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

      return {
        'matched': matched,
        'ungroupable': ungroupable
      };
    }

    const activeHandlers: { 'handler': MatcherHandlerInterface
      'matchers': MatcherUnionType[] }[] = [];

    for (let handlerIndex = 0; handlerIndex < matcherRegistry.ordered.length; handlerIndex++) {
      const handler = matcherRegistry.ordered[handlerIndex]!;
      const matchers = matchersByType.get(handler.type);

      if (matchers !== undefined && matchers.length > 0) {
        activeHandlers.push({
          'handler': handler,
          'matchers': matchers
        });
      }
    }

    for (let dataIndex = 0; dataIndex < data.length; dataIndex++) {
      const item = data[dataIndex]!;
      const value = DrilldownUtilities.getPropertyValue(item, property);

      if (Predicates.isNullish(value)) {
        ungroupable.push(item);
        continue;
      }

      const stringValue = String(value);

      if (stringMatcherMap.size > 0) {
        const group = stringMatcherMap.get(stringValue);

        if (group !== undefined) {
          group.nodes.push(item);
          continue;
        }
      }

      let wasMatched = false;

      for (let handlerIndex = 0; handlerIndex < activeHandlers.length; handlerIndex++) {
        const { handler, matchers } = activeHandlers[handlerIndex]!;

        if (handler.type === 'string') {
          continue;
        }

        for (let matcherIndex = 0; matcherIndex < matchers.length; matcherIndex++) {
          const matcher = matchers[matcherIndex]!;

          if (handler.match(matcher, value, stringValue, context)) {
            matcher.group.nodes.push(item);
            wasMatched = true;
            break;
          }
        }

        if (wasMatched) {
          break;
        }
      }

      if (!wasMatched) {
        ungroupable.push(item);
      }
    }

    return {
      'matched': matched,
      'ungroupable': ungroupable
    };
  }
};
