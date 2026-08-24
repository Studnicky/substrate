/**
 * Checks if a string ends with a suffix with case sensitivity support
 */

import type {
  FilterCondition
} from '../../types.js';

import { Guard } from '../../../guards/Guard.js';
import { areStringsMatching } from '../atomic/areStringsMatching.js';

export function doesStringEndWith(value: unknown, filterValue: unknown, condition: FilterCondition = {}) : boolean {
  if (!Guard.isString(value) || !Guard.isString(filterValue)) {
    return false;
  }

  return areStringsMatching(value, filterValue, condition, (str1, str2) => {return str1.endsWith(str2);});
}
