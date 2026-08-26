/**
 * Comparator functions with direct function access
 */

import type { ComparatorFunctionInterface } from '../interfaces.js';

import { IsDateLike } from '../comparators/atomic/isDateLike.js';
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
import { DeepFreeze } from '../utils/deepFreeze.js';

export const Comparator = DeepFreeze.deepFreeze({
  'CORE': {
    'deepEquals': AreDeeplyEqual.areDeeplyEqual,
    'isDateLike': IsDateLike.isDateLike,
    'isEmpty': IsEmpty.isEmpty,
    'isEqual': AreValuesStrictEqual.areValuesStrictEqual,
    'isInRange': IsInRange.isInRange,
    'isOutsideRange': IsOutsideRange.isOutsideRange,
    'matchesPattern': DoesValueMatchPattern.doesValueMatchPattern as ComparatorFunctionInterface,
    'stringCompareCaseAware': AreStringsEqualCaseAware.areStringsEqualCaseAware as ComparatorFunctionInterface,
    'stringContains': DoesStringContain.doesStringContain,
    'stringEndsWith': DoesStringEndWith.doesStringEndWith,
    'stringStartsWith': DoesStringStartWith.doesStringStartWith
  }
});
