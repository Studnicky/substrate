/**
 * Performs case-sensitive or case-insensitive string comparison
 */

import type { FilterConditionInterface } from '../../interfaces.js';

export class AreStringsMatching {
  static areStringsMatching(
    value: string,
    filterValue: string,
    condition: FilterConditionInterface,
    operation: (_firstValue: string, _secondValue: string) => boolean
  ): boolean   {
    // Check if caseSensitive is explicitly false (not just undefined/null)
    if (condition.caseSensitive === false) {
      const lowerCaseFilterValue = condition.lowerValue ?? filterValue.toLowerCase();

      const result = operation(value.toLowerCase(), lowerCaseFilterValue);
      return result;
    }

    // Default to case-sensitive if not explicitly set to false
    const result = operation(value, filterValue);
    return result;
  }
}
