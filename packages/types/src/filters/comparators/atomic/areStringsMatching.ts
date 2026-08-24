/**
 * Performs case-sensitive or case-insensitive string comparison
 */

import type { FilterCondition } from '../../types.js';

export function areStringsMatching(
  value: string,
  filterValue: string,
  condition: FilterCondition,
  operation: (_str1: string, _str2: string) => boolean
): boolean {
  // Check if caseSensitive is explicitly false (not just undefined/null)
  if (condition.caseSensitive === false) {
    const lowerStr = condition.lowerValue || filterValue.toLowerCase();

    return operation(value.toLowerCase(), lowerStr);
  }

  // Default to case-sensitive if not explicitly set to false
  return operation(value, filterValue);
}
