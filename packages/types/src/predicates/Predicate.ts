import type { PredicateFunctionInterface } from '../interfaces/PredicateFunctionInterface.js';

import { Predicates } from './Predicates.js';

/** Composes runtime type predicates without losing their narrowed value types. */
export class Predicate {
  public static and<Left, Right>(
    left: PredicateFunctionInterface<Left>,
    right: PredicateFunctionInterface<Right>
  ): PredicateFunctionInterface<Left & Right> {
    const result = (candidate: unknown): candidate is Left & Right => {
      const matches = left(candidate) && right(candidate);
      return matches;
    };
    return result;
  }

  public static or<Left, Right>(
    left: PredicateFunctionInterface<Left>,
    right: PredicateFunctionInterface<Right>
  ): PredicateFunctionInterface<Left | Right> {
    const result = (candidate: unknown): candidate is Left | Right => {
      const matches = left(candidate) || right(candidate);
      return matches;
    };
    return result;
  }

  public static not<Value>(predicate: PredicateFunctionInterface<Value>): PredicateFunctionInterface<unknown> {
    const result = (candidate: unknown): candidate is unknown => {
      const matches = !predicate(candidate);
      return matches;
    };
    return result;
  }

  public static field<PropertyName extends string, Value>(
    propertyName: PropertyName,
    predicate: PredicateFunctionInterface<Value>
  ): PredicateFunctionInterface<Record<PropertyName, Value>> {
    const result = (candidate: unknown): candidate is Record<PropertyName, Value> => {
      if (!Predicates.isRecord(candidate) || !Object.hasOwn(candidate, propertyName)) {
        return false;
      }
      const propertyValue = Reflect.get(candidate, propertyName);
      const matches = predicate(propertyValue);
      return matches;
    };
    return result;
  }

  public static arrayItems<Value>(predicate: PredicateFunctionInterface<Value>): PredicateFunctionInterface<readonly Value[]> {
    const result = (candidate: unknown): candidate is readonly Value[] => {
      if (!Predicates.isArray(candidate)) {
        return false;
      }
      const length = candidate.length;
      for (let index = 0; index < length; index += 1) {
        const item: unknown = candidate[index];
        if (!predicate(item)) {
          return false;
        }
      }
      return true;
    };
    return result;
  }

  public static mapEntries<Key, Value>(
    keyPredicate: PredicateFunctionInterface<Key>,
    valuePredicate: PredicateFunctionInterface<Value>
  ): PredicateFunctionInterface<Map<Key, Value>> {
    const result = (candidate: unknown): candidate is Map<Key, Value> => {
      if (!Predicates.isMap(candidate)) {
        return false;
      }
      for (const [key, value] of candidate) {
        if (!keyPredicate(key) || !valuePredicate(value)) {
          return false;
        }
      }
      return true;
    };
    return result;
  }
}
