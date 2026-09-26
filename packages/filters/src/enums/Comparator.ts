/**
 * Comparator functions with direct function access
 */

import { Frozen } from '@studnicky/json/browser';
import { Predicates } from '@studnicky/types/browser';

import { AreDeeplyEqual } from '../comparators/composite/areDeeplyEqual.js';
import { AreStringsEqualCaseAware } from '../comparators/composite/areStringsEqualCaseAware.js';
import { AreValuesStrictEqual } from '../comparators/composite/areValuesStrictEqual.js';
import { DoesStringContain } from '../comparators/composite/doesStringContain.js';
import { DoesStringEndWith } from '../comparators/composite/doesStringEndWith.js';
import { DoesStringStartWith } from '../comparators/composite/doesStringStartWith.js';
import { DoesValueMatchPattern } from '../comparators/composite/doesValueMatchPattern.js';
import { IsEmpty } from '../comparators/composite/isEmpty.js';
import { IsInRange } from '../comparators/composite/isInRange.js';
import { IsOutsideRange } from '../comparators/composite/isOutsideRange.js';

export const Comparator = Frozen.deepFreeze({
  'CORE': {
    'deepEquals': AreDeeplyEqual.areDeeplyEqual,
    'isDateLike': Predicates.isDateLike,
    'isEmpty': IsEmpty.isEmpty,
    'isEqual': AreValuesStrictEqual.areValuesStrictEqual,
    'isInRange': IsInRange.isInRange,
    'isOutsideRange': IsOutsideRange.isOutsideRange,
    'matchesPattern': DoesValueMatchPattern.matchesFilterValue,
    'stringCompareCaseAware': AreStringsEqualCaseAware.areStringsEqualCaseAware,
    'stringContains': DoesStringContain.doesStringContain,
    'stringEndsWith': DoesStringEndWith.doesStringEndWith,
    'stringStartsWith': DoesStringStartWith.doesStringStartWith
  }
});
