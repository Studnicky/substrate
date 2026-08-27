import { Predicates } from '@studnicky/types';

import type { SortRuleEntity } from '../../entities/SortRuleEntity.js';
import type { DataRecordInterface, GroupNodeInterface } from '../../interfaces/index.js';

import { DrilldownUtilities } from '../DrilldownUtilities.js';
import { MatcherHandlerLookup } from '../matchers/index.js';

class ValueComparer {
  static compare(firstValue: unknown, secondValue: unknown, direction: SortRuleEntity.Type['direction']): number {
    if (firstValue === null && secondValue === null) {
      return 0;
    }
    if (firstValue === undefined && secondValue === undefined) {
      return 0;
    }
    if (Predicates.isNullish(firstValue)) {
      return 1;
    }
    if (Predicates.isNullish(secondValue)) {
      const computedResult = -1;
      return computedResult;
    }

    let result: number;

    if (Predicates.isNumberType(firstValue) && Predicates.isNumberType(secondValue)) {
      result = firstValue - secondValue;
    }
    else {
      const handler = MatcherHandlerLookup.findNodeValueHandler(firstValue);

      if (handler !== null && handler.isNodeValue(firstValue) && handler.isNodeValue(secondValue)) {
        result = handler.compare(firstValue, secondValue);
      }
      else {
        result = String(firstValue).localeCompare(String(secondValue));
      }
    }

    const computedResult = direction === 'asc' ? result : -result;
    return computedResult;
  }
}

/**
 * Provides sorting operations for data records and group nodes.
 */
export const sortEngine = {
  /**
   * Compares two group nodes based on sort rules.
   * @param first - First group node
   * @param second - Second group node
   * @param sort - Sort rule specifying property and direction
   * @param getGroupCount - Function to get count of items in a node
   * @returns Comparison result
   */
  'compareGroupNodes': function (
    first: GroupNodeInterface,
    second: GroupNodeInterface,
    sort: SortRuleEntity.Type,
    getGroupCount: (node: GroupNodeInterface) => number
  ): number {
    if (sort.property === '$groupKey') {
      const result = ValueComparer.compare(first.value, second.value, sort.direction);

      return result;
    }

    if (sort.property === '$groupCount') {
      const firstCount = getGroupCount(first);
      const secondCount = getGroupCount(second);
      const result = ValueComparer.compare(firstCount, secondCount, sort.direction);

      return result;
    }

    return 0;
  },

  /**
   * Compares two values with directional support.
   * @param firstValue - First value to compare
   * @param secondValue - Second value to compare
   * @param direction - Sort direction (asc or desc)
   * @returns Comparison result (-1, 0, or 1)
   */
  'compareValues': ValueComparer.compare,

  /**
   * Sorts child group nodes based on sort rules.
   * @param children - Array of group nodes to sort
   * @param sorts - Sort rules to apply
   * @param getGroupCount - Function to get count of items in a node
   */
  'sortChildren': function (
    children: GroupNodeInterface[],
    sorts: SortRuleEntity.Type[] | undefined,
    getGroupCount: (node: GroupNodeInterface) => number
  ): void {
    const groupSorts = sorts?.filter((sortRule) => { const result = sortRule.property.startsWith('$'); return result; }) ?? [];

    if (groupSorts.length === 0) {
      return;
    }

    const sorted = children.toSorted((first, second) => {
      for (let index = 0; index < groupSorts.length; index++) {
        const comparison = sortEngine.compareGroupNodes(first, second, groupSorts[index]!, getGroupCount);

        if (comparison !== 0) {
          return comparison;
        }
      }

      return 0;
    });
    children.splice(0, children.length, ...sorted);
  },

  /**
   * Sorts data records based on sort rules.
   * @param nodes - Array of data records to sort
   * @param sorts - Sort rules to apply
   */
  'sortNodes': function (nodes: DataRecordInterface[], sorts: SortRuleEntity.Type[] | undefined): void {
    const nodeSorts = sorts?.filter((sortRule) => { const result = !sortRule.property.startsWith('$');
      return result; }) ?? [];

    if (nodeSorts.length === 0 || nodes.length <= 1) {
      return;
    }

    const sorted = nodes.toSorted((first, second) => {
      for (let index = 0; index < nodeSorts.length; index++) {
        const sort = nodeSorts[index]!;
        const firstValue = DrilldownUtilities.getPropertyValue(first, sort.property);
        const secondValue = DrilldownUtilities.getPropertyValue(second, sort.property);
        const comparison = ValueComparer.compare(firstValue, secondValue, sort.direction);

        if (comparison !== 0) {
          return comparison;
        }
      }

      return 0;
    });
    nodes.splice(0, nodes.length, ...sorted);
  }
};
