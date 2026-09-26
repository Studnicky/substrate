import { DateSemverPredicates } from './DateSemverPredicates.js';

interface DeepEqualityStateInterface {
  readonly 'leftToRight': Map<object, object>
  readonly 'rightToLeft': Map<object, object>
}

/** Structural equality, reference/NaN comparators, and runtime-value comparison used by `satisfiesEnum`/`satisfiesUniqueItems`. */
export class RuntimeValuePredicates extends DateSemverPredicates {
  /**
   * Returns true when two supported runtime values have the same structure.
   *
   * Primitive values use Object.is semantics, so NaN equals NaN and -0 differs
   * from +0. Dates compare their timestamps, regular expressions compare source
   * and flags, arrays preserve order, and Map and Set entries compare
   * structurally without depending on insertion order. Object graphs retain
   * reference topology: a self-reference does not equal a two-node cycle.
   */
  public static areDeeplyEqual(value: unknown, filterValue: unknown): boolean {
    const state: DeepEqualityStateInterface = { 'leftToRight': new Map(), 'rightToLeft': new Map() };
    const result = RuntimeValuePredicates.compareRuntimeValues(value, filterValue, state);
    return result;
  }

  /** `NaN` comparison for deep equality — `NaN` is considered equal to `NaN`. */
  public static areNaNEqual(value: unknown, filterValue: unknown): boolean {
    if (Number.isNaN(value) && Number.isNaN(filterValue)) {
      return true;
    }
    if (Number.isNaN(value) || Number.isNaN(filterValue)) {
      return false;
    }

    return false;
  }

  /** `NaN` comparison for strict equality — `NaN` is never equal to anything, including itself. */
  public static areNaNStrict(value: unknown, filterValue: unknown): boolean {
    if (Number.isNaN(value) || Number.isNaN(filterValue)) {
      return false;
    }

    const result = value === filterValue;
    return result;
  }

  /** Checks two values are not strictly equal using `Object.is` semantics. */
  public static areNotStrictlyEqual(value: unknown, filterValue: unknown): boolean {
    const result = !Object.is(value, filterValue);
    return result;
  }

  /** Checks null/undefined equality — `null`/`undefined` are only equal to themselves. */
  public static areNullUndefinedEqual(value: unknown, filterValue: unknown): boolean {
    if (value === null || value === undefined || filterValue === null || filterValue === undefined) {
      const result = value === filterValue;
      return result;
    }

    return false;
  }

  /** Object comparison using reference equality — `Date`/`RegExp`/array instances included. */
  public static areObjectsReferenceEqual(value: unknown, filterValue: unknown): boolean {
    if ((typeof value === 'object' && value !== null) || (typeof filterValue === 'object' && filterValue !== null)) {
      if (typeof value !== 'object' || typeof filterValue !== 'object' || value === null || filterValue === null) {
        return false;
      }

      const result = value === filterValue;
      return result;
    }

    return false;
  }

  /** Case-sensitive or case-insensitive string comparison via a supplied `operation`. */
  public static areStringsMatching(
    value: string,
    filterValue: string,
    options: Readonly<{ 'caseSensitive'?: boolean; 'lowerValue'?: string }>,
    operation: (firstValue: string, secondValue: string) => boolean
  ): boolean {
    if (options.caseSensitive === false) {
      const lowerCaseFilterValue = options.lowerValue ?? filterValue.toLowerCase();

      const result = operation(value.toLowerCase(), lowerCaseFilterValue);
      return result;
    }

    const result = operation(value, filterValue);
    return result;
  }

  /** Validates that both values are strings. */
  public static areStringsValid<T>(value: T, filterValue: unknown): value is string & T {
    const result = typeof value === 'string' && typeof filterValue === 'string';
    return result;
  }

  /** Checks two values share the same `typeof` result. */
  public static areTypesSame(value: unknown, filterValue: unknown): boolean {
    const result = typeof value === typeof filterValue;
    return result;
  }

  /** Checks two values are instances of the same constructor. */
  public static areInstancesOf<T>(
    value: unknown,
    filterValue: unknown,
    constructor: new (...constructorArguments: unknown[]) => T
  ): value is T {
    const result = value instanceof constructor && filterValue instanceof constructor;
    return result;
  }

  public static satisfiesEnum(value: unknown, enumValues: unknown[]): boolean {
    const enumValueCount = enumValues.length;
    for (let index = 0; index < enumValueCount; index += 1) {
      const enumValue = enumValues[index];
      if (RuntimeValuePredicates.areDeeplyEqual(value, enumValue)) {
        return true;
      }
    }
    return false;
  }

  public static satisfiesUniqueItems(value: unknown[]): boolean {
    const valueLength = value.length;

    for (let index = 0; index < valueLength; index++) {
      for (let other = index + 1; other < valueLength; other++) {
        if (RuntimeValuePredicates.areDeeplyEqual(value[index], value[other])) {
          return false;
        }
      }
    }

    return true;
  }

  private static compareArray(value: readonly unknown[], filterValue: readonly unknown[], state: DeepEqualityStateInterface): boolean {
    if (value.length !== filterValue.length) {
      return false;
    }

    for (let index = 0; index < value.length; index += 1) {
      if (!RuntimeValuePredicates.compareRuntimeValues(value[index], filterValue[index], state)) {
        return false;
      }
    }

    return true;
  }

  private static compareArrayOperands(value: object, filterValue: object, state: DeepEqualityStateInterface): boolean {
    if (!Array.isArray(value) || !Array.isArray(filterValue) || !RuntimeValuePredicates.linkDeepEqualityPair(value, filterValue, state)) {
      return false;
    }

    const result = RuntimeValuePredicates.compareArray(value, filterValue, state);
    return result;
  }

  private static compareDateOperands(value: object, filterValue: object): boolean | undefined {
    if (!(value instanceof Date) && !(filterValue instanceof Date)) {
      return undefined;
    }

    const result = value instanceof Date && filterValue instanceof Date && Object.is(value.getTime(), filterValue.getTime());
    return result;
  }

  private static compareMap(value: Map<unknown, unknown>, filterValue: Map<unknown, unknown>, state: DeepEqualityStateInterface): boolean {
    if (value.size !== filterValue.size) {
      return false;
    }

    const filterEntries: [unknown, unknown][] = Array.from(filterValue.entries());
    const matchedIndexes = new Set<number>();
    for (const [valueKey, valueEntry] of value.entries()) {
      const matched = RuntimeValuePredicates.findMatchingMapEntry(valueKey, valueEntry, filterEntries, { 'matchedIndexes': matchedIndexes, 'state': state });
      if (!matched) {
        return false;
      }
    }

    return true;
  }

  /** Scans unmatched filter entries for one whose key and value both compare deeply equal; marks the index used on a hit. */
  private static findMatchingMapEntry(
    valueKey: unknown,
    valueEntry: unknown,
    filterEntries: readonly [unknown, unknown][],
    options: Readonly<{ 'matchedIndexes': Set<number>; 'state': DeepEqualityStateInterface }>
  ): boolean {
    const { matchedIndexes, state } = options;

    for (let index = 0; index < filterEntries.length; index += 1) {
      if (matchedIndexes.has(index)) {
        continue;
      }
      const filterEntry = filterEntries[index];
      if (filterEntry === undefined) {
        continue;
      }
      const candidateState = RuntimeValuePredicates.copyDeepEqualityState(state);
      if (RuntimeValuePredicates.compareRuntimeValues(valueKey, filterEntry[0], candidateState)
        && RuntimeValuePredicates.compareRuntimeValues(valueEntry, filterEntry[1], candidateState)) {
        RuntimeValuePredicates.replaceDeepEqualityState(state, candidateState);
        matchedIndexes.add(index);
        return true;
      }
    }

    return false;
  }

  private static compareMapOperands(value: object, filterValue: object, state: DeepEqualityStateInterface): boolean {
    if (!(value instanceof Map) || !(filterValue instanceof Map) || !RuntimeValuePredicates.linkDeepEqualityPair(value, filterValue, state)) {
      return false;
    }

    const result = RuntimeValuePredicates.compareMap(value, filterValue, state);
    return result;
  }

  private static compareRecord(value: Record<string, unknown>, filterValue: Record<string, unknown>, state: DeepEqualityStateInterface): boolean {
    const valueKeys = Object.keys(value);
    if (valueKeys.length !== Object.keys(filterValue).length) {
      return false;
    }

    for (let index = 0; index < valueKeys.length; index += 1) {
      const key = valueKeys[index];
      if (key === undefined || !Object.hasOwn(filterValue, key) || !RuntimeValuePredicates.compareRuntimeValues(value[key], filterValue[key], state)) {
        return false;
      }
    }

    return true;
  }

  private static compareRecordOperands(value: object, filterValue: object, state: DeepEqualityStateInterface): boolean {
    if (!RuntimeValuePredicates.isRecord(value) || !RuntimeValuePredicates.isRecord(filterValue) || !RuntimeValuePredicates.linkDeepEqualityPair(value, filterValue, state)) {
      return false;
    }

    const result = RuntimeValuePredicates.compareRecord(value, filterValue, state);
    return result;
  }

  private static compareRegExpOperands(value: object, filterValue: object): boolean | undefined {
    if (!(value instanceof RegExp) && !(filterValue instanceof RegExp)) {
      return undefined;
    }

    const result = value instanceof RegExp && filterValue instanceof RegExp && value.source === filterValue.source && value.flags === filterValue.flags;
    return result;
  }

  private static compareRuntimeValues(value: unknown, filterValue: unknown, state: DeepEqualityStateInterface): boolean {
    if (Object.is(value, filterValue)) {
      return true;
    }
    if (!RuntimeValuePredicates.isObjectLike(value) || !RuntimeValuePredicates.isObjectLike(filterValue)) {
      return false;
    }

    const dateResult = RuntimeValuePredicates.compareDateOperands(value, filterValue);
    if (dateResult !== undefined) {
      return dateResult;
    }
    const regExpResult = RuntimeValuePredicates.compareRegExpOperands(value, filterValue);
    if (regExpResult !== undefined) {
      return regExpResult;
    }

    const existingPair = RuntimeValuePredicates.existingDeepEqualityPair(value, filterValue, state);
    if (existingPair !== undefined) {
      return existingPair;
    }

    const result = RuntimeValuePredicates.compareStructuralOperands(value, filterValue, state);
    return result;
  }

  private static compareSet(value: ReadonlySet<unknown>, filterValue: ReadonlySet<unknown>, state: DeepEqualityStateInterface): boolean {
    if (value.size !== filterValue.size) {
      return false;
    }

    const filterValues: unknown[] = Array.from(filterValue.values());
    const matchedIndexes = new Set<number>();
    for (const valueItem of value.values()) {
      let matched = false;
      for (let index = 0; index < filterValues.length; index += 1) {
        if (matchedIndexes.has(index)) {
          continue;
        }
        const candidateState = RuntimeValuePredicates.copyDeepEqualityState(state);
        if (RuntimeValuePredicates.compareRuntimeValues(valueItem, filterValues[index], candidateState)) {
          RuntimeValuePredicates.replaceDeepEqualityState(state, candidateState);
          matchedIndexes.add(index);
          matched = true;
          break;
        }
      }
      if (!matched) {
        return false;
      }
    }

    return true;
  }

  private static compareSetOperands(value: object, filterValue: object, state: DeepEqualityStateInterface): boolean {
    if (!(value instanceof Set) || !(filterValue instanceof Set) || !RuntimeValuePredicates.linkDeepEqualityPair(value, filterValue, state)) {
      return false;
    }

    const result = RuntimeValuePredicates.compareSet(value, filterValue, state);
    return result;
  }

  /** Dispatches on operand shape (Array/Map/Set/Record); each check mutates `state` via `linkDeepEqualityPair` on match, so the branch order below is preserved unchanged from the original. */
  private static compareStructuralOperands(value: object, filterValue: object, state: DeepEqualityStateInterface): boolean {
    if (Array.isArray(value) || Array.isArray(filterValue)) {
      const result = RuntimeValuePredicates.compareArrayOperands(value, filterValue, state);
      return result;
    }
    if (value instanceof Map || filterValue instanceof Map) {
      const result = RuntimeValuePredicates.compareMapOperands(value, filterValue, state);
      return result;
    }
    if (value instanceof Set || filterValue instanceof Set) {
      const result = RuntimeValuePredicates.compareSetOperands(value, filterValue, state);
      return result;
    }

    const result = RuntimeValuePredicates.compareRecordOperands(value, filterValue, state);
    return result;
  }

  private static copyDeepEqualityState(state: DeepEqualityStateInterface): DeepEqualityStateInterface {
    const result: DeepEqualityStateInterface = {
      'leftToRight': new Map(state.leftToRight),
      'rightToLeft': new Map(state.rightToLeft)
    };
    return result;
  }

  private static existingDeepEqualityPair(value: object, filterValue: object, state: DeepEqualityStateInterface): boolean | undefined {
    const mappedFilterValue = state.leftToRight.get(value);
    if (mappedFilterValue !== undefined) {
      const result = mappedFilterValue === filterValue;
      return result;
    }
    const mappedValue = state.rightToLeft.get(filterValue);
    if (mappedValue !== undefined) {
      const result = mappedValue === value;
      return result;
    }

    return undefined;
  }

  private static linkDeepEqualityPair(value: object, filterValue: object, state: DeepEqualityStateInterface): boolean {
    state.leftToRight.set(value, filterValue);
    state.rightToLeft.set(filterValue, value);
    return true;
  }

  private static replaceDeepEqualityState(target: DeepEqualityStateInterface, source: DeepEqualityStateInterface): void {
    target.leftToRight.clear();
    target.rightToLeft.clear();
    for (const [value, filterValue] of source.leftToRight.entries()) {
      target.leftToRight.set(value, filterValue);
    }
    for (const [filterValue, value] of source.rightToLeft.entries()) {
      target.rightToLeft.set(filterValue, value);
    }
  }
}
