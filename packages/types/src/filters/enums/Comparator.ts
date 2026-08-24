/**
 * Comparator functions with direct function access
 */

import type { ComparatorFunction } from '../types.js';

import { isDateLike } from '../comparators/atomic/isDateLike.js';
import { areStringsEqualCaseAware } from '../comparators/composite/areStringsEqualCaseAware.js';
import { areDeeplyEqual } from '../comparators/composite/deepEquals.js';
import { doesStringEndWith } from '../comparators/composite/doesStringEndWith.js';
import { doesStringStartWith } from '../comparators/composite/doesStringStartWith.js';
import { isEmpty } from '../comparators/composite/isEmpty.js';
import { areValuesStrictEqual } from '../comparators/composite/isEqual.js';
import { isInRange } from '../comparators/composite/isInRange.js';
import { isOutsideRange } from '../comparators/composite/isOutsideRange.js';
import { doesValueMatchPattern } from '../comparators/composite/matchesPattern.js';
import { doesStringContain } from '../comparators/composite/stringContains.js';
import { deepFreeze } from '../utils/deepFreeze.js';

export const Comparator = deepFreeze({
  'CORE': {
    'deepEquals': areDeeplyEqual,
    'isDateLike': isDateLike,
    'isEmpty': isEmpty,
    'isEqual': areValuesStrictEqual,
    'isInRange': isInRange,
    'isOutsideRange': isOutsideRange,
    'matchesPattern': doesValueMatchPattern as ComparatorFunction,
    'stringCompareCaseAware': areStringsEqualCaseAware as ComparatorFunction,
    'stringContains': doesStringContain,
    'stringEndsWith': doesStringEndWith,
    'stringStartsWith': doesStringStartWith
  }
});
