/**
 * Comparator functions for filtering operations
 */

// Deep equality atomics
export { AreArraysEqual } from './atomic/areArraysEqual.js';
// ============= Atomic Comparators =============
// Basic type checks and state
export { AreInstancesOf } from './atomic/areInstancesOf.js';
export { AreMapsEqual } from './atomic/areMapsEqual.js';
export { AreNaNEqual } from './atomic/areNaNEqual.js';
export { AreNaNStrict } from './atomic/areNaNStrict.js';
export { AreNotStrictlyEqual } from './atomic/areNotStrictlyEqual.js';
export { AreNullUndefinedEqual } from './atomic/areNullUndefinedEqual.js';
export { AreObjectsEqual } from './atomic/areObjectsEqual.js';
export { AreObjectsReferenceEqual } from './atomic/areObjectsReferenceEqual.js';
// Equality comparisons
export { AreReferenceEqual } from './atomic/areReferenceEqual.js';
export { AreStringsMatching } from './atomic/areStringsMatching.js';
// String foundations
export { AreStringsValid } from './atomic/areStringsValid.js';
export { AreTypesSame } from './atomic/areTypesSame.js';
export { DoesObjectContainProperty } from './atomic/doesObjectContainProperty.js';
export { IsAlphanumeric } from './atomic/isAlphanumeric.js';
export { IsArray } from './atomic/isArray.js';
export { IsArrayLength } from './atomic/isArrayLength.js';
export { IsCallable } from './atomic/isCallable.js';
export { IsCloseTo } from './atomic/isCloseTo.js';
export { IsDate } from './atomic/isDate.js';
// Utility and validation
export { IsDateLike } from './atomic/isDateLike.js';
export { IsDefined } from './atomic/isDefined.js';

// Emptiness and length checks
export { IsEmptyArray } from './atomic/isEmptyArray.js';
export { IsEmptyMap } from './atomic/isEmptyMap.js';
export { IsEmptyPlainObject } from './atomic/isEmptyPlainObject.js';
export { IsEmptyRegExp } from './atomic/isEmptyRegExp.js';
export { IsEmptySet } from './atomic/isEmptySet.js';
export { IsEmptyString } from './atomic/isEmptyString.js';
export { IsEmptyTypedArray } from './atomic/isEmptyTypedArray.js';
export { IsEven } from './atomic/isEven.js';

export { IsFalse } from './atomic/isFalse.js';
export { IsFalsy } from './atomic/isFalsy.js';

export { IsFinite } from './atomic/isFinite.js';
export { IsFunction } from './atomic/isFunction.js';
// Numeric comparisons
export { IsGreaterThan } from './atomic/isGreaterThan.js';
export { IsGreaterThanOrEqual } from './atomic/isGreaterThanOrEqual.js';
export { IsInstanceOf } from './atomic/isInstanceOf.js';
export { IsInteger } from './atomic/isInteger.js';
export { IsIterable } from './atomic/isIterable.js';
export { IsLessThan } from './atomic/isLessThan.js';
export { IsLessThanOrEqual } from './atomic/isLessThanOrEqual.js';
export { IsMap } from './atomic/isMap.js';
export { IsNegative } from './atomic/isNegative.js';

export { IsNotNull } from './atomic/isNotNull.js';
export { IsNull } from './atomic/isNull.js';
export { IsNullOrUndefined } from './atomic/isNullOrUndefined.js';
export { IsNumber } from './atomic/isNumber.js';
export { IsObjectPropertyCount } from './atomic/isObjectPropertyCount.js';
export { IsOdd } from './atomic/isOdd.js';
export { IsPositive } from './atomic/isPositive.js';
export { IsPromise } from './atomic/isPromise.js';

export { IsRangeValid } from './atomic/isRangeValid.js';
export { IsRegExp } from './atomic/isRegExp.js';
export { IsSet } from './atomic/isSet.js';
export { IsString } from './atomic/isString.js';
export { IsStringLength } from './atomic/isStringLength.js';
export { IsSymbol } from './atomic/isSymbol.js';
export { IsTrue } from './atomic/isTrue.js';
export { IsTruthy } from './atomic/isTruthy.js';
export { IsTypeOf } from './atomic/isTypeOf.js';

export { IsUndefined } from './atomic/isUndefined.js';
export { IsVulnerablePattern } from './atomic/isVulnerablePattern.js';
export { PerformRangeComparison } from './atomic/performRangeComparison.js';

// ============= Composite Comparators =============
export { AreDeeplyEqual } from './composite/areDeeplyEqual.js';
export { AreObjectsPartiallyEqual } from './composite/areObjectsPartiallyEqual.js';
export { AreStrictlyEqual } from './composite/areStrictlyEqual.js';
export { AreStringsEqual } from './composite/areStringsEqual.js';
export { AreStringsEqualCaseAware } from './composite/areStringsEqualCaseAware.js';
export { AreValuesStrictEqual } from './composite/areValuesStrictEqual.js';
export { ContainsWord } from './composite/containsWord.js';
export { DoesArrayContain } from './composite/doesArrayContain.js';
export { DoesArrayContainAll } from './composite/doesArrayContainAll.js';
export { DoesArrayContainAny } from './composite/doesArrayContainAny.js';
export { DoesObjectContainAllProperties } from './composite/doesObjectContainAllProperties.js';
export { DoesObjectContainAnyProperty } from './composite/doesObjectContainAnyProperty.js';
export { DoesObjectContainPropertyValue } from './composite/doesObjectContainPropertyValue.js';
export { DoesStringContain } from './composite/doesStringContain.js';
export { DoesStringEndWith } from './composite/doesStringEndWith.js';
export { DoesStringStartWith } from './composite/doesStringStartWith.js';
export { DoesValueMatchPattern } from './composite/doesValueMatchPattern.js';
export { HasDuplicates } from './composite/hasDuplicates.js';
// Length comparisons
export { HasLength } from './composite/hasLength.js';
// Deep property operations
export { HasPropertyPath } from './composite/hasPropertyPath.js';
// Collection operations
export { HasUniqueElements } from './composite/hasUniqueElements.js';
export { IsArraySubset } from './composite/isArraySubset.js';

export { IsEmpty } from './composite/isEmpty.js';
export { IsEmptyObject } from './composite/isEmptyObject.js';
// Range and pattern operations
export { IsInRange } from './composite/isInRange.js';

export { IsLongerThan } from './composite/isLongerThan.js';
export { IsLongerThanOrEqual } from './composite/isLongerThanOrEqual.js';

export { IsNotCloseTo } from './composite/isNotCloseTo.js';

export { IsOutsideRange } from './composite/isOutsideRange.js';

export { IsSerializable } from './composite/isSerializable.js';
export { IsShorterThan } from './composite/isShorterThan.js';
export { IsShorterThanOrEqual } from './composite/isShorterThanOrEqual.js';
