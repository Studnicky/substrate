import { Predicates } from '@studnicky/types/browser';

import type { DateRangeFilterRuleEntity } from '../../entities/DateRangeFilterRuleEntity.js';
import type { FilterRuleEntity } from '../../entities/FilterRuleEntity.js';
import type { NumericRangeFilterRuleEntity } from '../../entities/NumericRangeFilterRuleEntity.js';
import type { ValueFilterRuleEntity } from '../../entities/ValueFilterRuleEntity.js';

import { DrilldownUtilities } from '../DrilldownUtilities.js';
import { valueConverter } from './valueConverter.js';

class FilterPredicates {
  static passesDateFilter(item: Record<string, unknown>, filter: DateRangeFilterRuleEntity.Type): boolean {
    const value = DrilldownUtilities.getPropertyValue(item, filter.property);
    const dateValue = Predicates.isNumberType(value) && Predicates.isFiniteNumber(value) ? Math.trunc(value) : null;

    if (dateValue === null) {
      return false;
    }

    if (filter.minimum !== undefined && dateValue < filter.minimum) {
      return false;
    }

    if (filter.maximum !== undefined && dateValue > filter.maximum) {
      return false;
    }

    return true;
  }

  static passesFilter(item: Record<string, unknown>, filter: FilterRuleEntity.Type): boolean {
    switch (filter.type) {
      case 'date':
        return FilterPredicates.passesDateFilter(item, filter);
      case 'numeric':
        return FilterPredicates.passesNumericFilter(item, filter);
      case 'value':
        return FilterPredicates.passesValueFilter(item, filter);
      default:
        return filter;
    }
  }

  static passesNumericFilter(item: Record<string, unknown>, filter: NumericRangeFilterRuleEntity.Type): boolean {
    const value = DrilldownUtilities.getPropertyValue(item, filter.property);
    const numberValue = valueConverter.toStrictNumber(value);

    if (numberValue === null) {
      return false;
    }

    if (filter.minimum !== undefined && numberValue < filter.minimum) {
      return false;
    }

    if (filter.maximum !== undefined && numberValue > filter.maximum) {
      return false;
    }

    return true;
  }

  static passesValueFilter(item: Record<string, unknown>, filter: ValueFilterRuleEntity.Type): boolean {
    const value = DrilldownUtilities.getPropertyValue(item, filter.property);

    if (Predicates.isNullish(value)) {
      const result = filter.operator === 'exclude';
      return result;
    }

    const valueInSet = filter.values.includes(String(value));

    const result = filter.operator === 'exclude' ? !valueInSet : valueInSet;
    return result;
  }
}

/**
 * Provides filter operations for data records.
 */
export const filterEngine = {
  /**
   * Filters data records based on filter rules.
   * @param data - Array of data records to filter
   * @param filters - Array of filter rules to apply
   * @returns Filtered array of records that pass all filter rules
   */
  'applyFilters': function (data: Record<string, unknown>[], filters: FilterRuleEntity.Type[]): Record<string, unknown>[] {
    if (filters.length === 0) {
      return data;
    }

    const result = data.filter((item) => {
      for (let index = 0; index < filters.length; index++) {
        if (!FilterPredicates.passesFilter(item, filters[index]!)) {
          return false;
        }
      }
      return true;
    });
    return result;
  }
};
