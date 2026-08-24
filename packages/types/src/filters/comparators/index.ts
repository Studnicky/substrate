/**
 * Comparator functions for filtering operations
 */

// Deep equality atomics
export { areArraysEqual } from './atomic/areArraysEqual.js';
// ============= Atomic Comparators =============
// Basic type checks and state
export { areInstancesOf } from './atomic/areInstancesOf.js';
export { areMapsEqual } from './atomic/areMapsEqual.js';
export { areNaNEqual } from './atomic/areNaNEqual.js';
export { areNaNStrict } from './atomic/areNaNStrict.js';
export { areNotStrictlyEqual } from './atomic/areNotStrictlyEqual.js';
export { areNullUndefinedEqual } from './atomic/areNullUndefinedEqual.js';
export { areObjectsEqual } from './atomic/areObjectsEqual.js';
export { areObjectsReferenceEqual } from './atomic/areObjectsReferenceEqual.js';
// Equality comparisons
export { areReferenceEqual } from './atomic/areReferenceEqual.js';
export { areStringsMatching } from './atomic/areStringsMatching.js';
// String foundations
export { areStringsValid } from './atomic/areStringsValid.js';
export { areTypesSame } from './atomic/areTypesSame.js';
export { doesObjectContainProperty } from './atomic/doesObjectContainProperty.js';
export { isAlphanumeric } from './atomic/isAlphanumeric.js';
export { isArray } from './atomic/isArray.js';
export { isArrayLength } from './atomic/isArrayLength.js';
export { isCallable } from './atomic/isCallable.js';
export { isCloseTo } from './atomic/isCloseTo.js';
export { isDate } from './atomic/isDate.js';
// Utility and validation
export { isDateLike } from './atomic/isDateLike.js';
export { isDefined } from './atomic/isDefined.js';

// Emptiness and length checks
export { isEmptyArray } from './atomic/isEmptyArray.js';
export { isEmptyMap } from './atomic/isEmptyMap.js';
export { isEmptyPlainObject } from './atomic/isEmptyPlainObject.js';
export { isEmptyRegExp } from './atomic/isEmptyRegExp.js';
export { isEmptySet } from './atomic/isEmptySet.js';
export { isEmptyString } from './atomic/isEmptyString.js';
export { isEmptyTypedArray } from './atomic/isEmptyTypedArray.js';
export { isEven } from './atomic/isEven.js';

export { isFalse } from './atomic/isFalse.js';
export { isFalsy } from './atomic/isFalsy.js';

export { isFinite } from './atomic/isFinite.js';
export { isFunction } from './atomic/isFunction.js';
// Numeric comparisons
export { isGreaterThan } from './atomic/isGreaterThan.js';
export { isGreaterThanOrEqual } from './atomic/isGreaterThanOrEqual.js';
export { isInstanceOf } from './atomic/isInstanceOf.js';
export { isInteger } from './atomic/isInteger.js';
export { isIterable } from './atomic/isIterable.js';
export { isLessThan } from './atomic/isLessThan.js';
export { isLessThanOrEqual } from './atomic/isLessThanOrEqual.js';
export { isMap } from './atomic/isMap.js';
export { isNegative } from './atomic/isNegative.js';

export { isNotNull } from './atomic/isNotNull.js';
export { isNull } from './atomic/isNull.js';
export { isNullOrUndefined } from './atomic/isNullOrUndefined.js';
export { isNumber } from './atomic/isNumber.js';
export { isObjectPropertyCount } from './atomic/isObjectPropertyCount.js';
export { isOdd } from './atomic/isOdd.js';
export { isPositive } from './atomic/isPositive.js';
export { isPromise } from './atomic/isPromise.js';

export { isRangeValid } from './atomic/isRangeValid.js';
export { isRegExp } from './atomic/isRegExp.js';
export { isSet } from './atomic/isSet.js';
export { isString } from './atomic/isString.js';
export { isStringLength } from './atomic/isStringLength.js';
export { isSymbol } from './atomic/isSymbol.js';
export { isTrue } from './atomic/isTrue.js';
export { isTruthy } from './atomic/isTruthy.js';
export { isTypeOf } from './atomic/isTypeOf.js';

export { isUndefined } from './atomic/isUndefined.js';
export { isVulnerablePattern } from './atomic/isVulnerablePattern.js';
export { performRangeComparison } from './atomic/performRangeComparison.js';

// Object operations
export { areObjectsPartiallyEqual } from './composite/areObjectsPartiallyEqual.js';
export { areStrictlyEqual } from './composite/areStrictlyEqual.js';
// String operations
export { areStringsEqual } from './composite/areStringsEqual.js';

export { areStringsEqualCaseAware } from './composite/areStringsEqualCaseAware.js';
// Advanced string operations
export { containsWord } from './composite/containsWord.js';
// ============= Composite Comparators =============
// High-level equality
export { areDeeplyEqual } from './composite/deepEquals.js';

// Array operations
export { doesArrayContain } from './composite/doesArrayContain.js';
export { doesArrayContainAll } from './composite/doesArrayContainAll.js';
export { doesArrayContainAny } from './composite/doesArrayContainAny.js';
export { doesObjectContainAllProperties } from './composite/doesObjectContainAllProperties.js';

export { doesObjectContainAnyProperty } from './composite/doesObjectContainAnyProperty.js';
export { doesObjectContainPropertyValue } from './composite/doesObjectContainPropertyValue.js';
export { doesStringEndWith } from './composite/doesStringEndWith.js';

export { doesStringStartWith } from './composite/doesStringStartWith.js';
export { hasDuplicates } from './composite/hasDuplicates.js';
// Length comparisons
export { hasLength } from './composite/hasLength.js';
// Deep property operations
export { hasPropertyPath } from './composite/hasPropertyPath.js';
// Collection operations
export { hasUniqueElements } from './composite/hasUniqueElements.js';
export { isArraySubset } from './composite/isArraySubset.js';

export { isEmpty } from './composite/isEmpty.js';
export { isEmptyObject } from './composite/isEmptyObject.js';
export { areValuesStrictEqual } from './composite/isEqual.js';
// Range and pattern operations
export { isInRange } from './composite/isInRange.js';

export { isLongerThan } from './composite/isLongerThan.js';
export { isLongerThanOrEqual } from './composite/isLongerThanOrEqual.js';

export { isNotCloseTo } from './composite/isNotCloseTo.js';

export { isOutsideRange } from './composite/isOutsideRange.js';

export { isSerializable } from './composite/isSerializable.js';
export { isShorterThan } from './composite/isShorterThan.js';
export { isShorterThanOrEqual } from './composite/isShorterThanOrEqual.js';
export { doesValueMatchPattern } from './composite/matchesPattern.js';
export { doesStringContain } from './composite/stringContains.js';
