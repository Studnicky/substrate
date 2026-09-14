import { Predicates } from '@studnicky/types/node';

import { FrozenMutationError } from '../errors/FrozenMutationError.js';
import { FROZEN_MAP_MUTATORS, FROZEN_SET_MUTATORS } from './constants/FrozenConstants.js';

/**
 * Frozen — cycle-safe recursive deep freeze.
 *
 * Recursively freezes objects and their nested values, tracking references in a
 * WeakMap so circular structures are handled safely and nested Map/Set proxies
 * are retained by their parents.
 *
 * Subclass `Frozen` and override `protected static shouldFreeze` to customise
 * freeze behaviour.
 */

export class Frozen {
  // ---------------------------------------------------------------------------
  // Protected steps — override in subclasses to customise freezing
  // ---------------------------------------------------------------------------

  /** Build the `get` trap for a mutation-guarded Map/Set `Proxy`, bound to `target` and `mutators`. */
  protected static createMutationGetTrap<T extends object>(target: T, mutators: ReadonlySet<PropertyKey>): (source: T, prop: PropertyKey) => unknown {
    const result = (source: T, prop: PropertyKey): unknown => {
      const value: unknown = Reflect.get(source, prop, source);

      if (mutators.has(prop)) {
        return (): never => {
          throw new FrozenMutationError(`Cannot call "${String(prop)}" on a frozen ${target.constructor.name}`, String(prop));
        };
      }

      const resolvedValue: unknown = typeof value === 'function' ? value.bind(source) : value;
      return resolvedValue;
    };
    return result;
  }

  /** Wrap a Map/Set in a `Proxy` that throws `FrozenMutationError` on mutating method calls. */
  protected static guardMutations<T extends object>(target: T, mutators: ReadonlySet<PropertyKey>): T {
    const result = new Proxy(target, {
      'get': this.createMutationGetTrap(target, mutators)
    });
    return result;
  }

  /**
   * Recurse into a value and replace reachable Map and Set references with
   * mutation-guarded proxies before freezing their parent container.
   */
  protected static freezeValue(value: unknown, frozenValues: WeakMap<object, object>): unknown {
    if (!Predicates.isObjectLike(value)) {
      return value;
    }

    const existingValue = frozenValues.get(value);
    if (existingValue !== undefined) {
      return existingValue;
    }
    if (value instanceof Map) {
      const result = this.freezeMap(value, frozenValues);
      return result;
    }
    if (value instanceof Set) {
      const result = this.freezeSet(value, frozenValues);
      return result;
    }

    frozenValues.set(value, value);
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const item: unknown = value[index];
        const frozenItem = this.freezeValue(item, frozenValues);
        if (!Object.is(item, frozenItem)) {
          Reflect.set(value, index, frozenItem);
        }
      }
    } else {
      const keys = Object.keys(value);
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        if (key === undefined) {
          continue;
        }
        const child: unknown = Reflect.get(value, key);
        const frozenChild = this.freezeValue(child, frozenValues);
        if (!Object.is(child, frozenChild)) {
          Reflect.set(value, key, frozenChild);
        }
      }
    }

    if (this.shouldFreeze(value)) {
      Object.freeze(value);
    }

    return value;
  }

  protected static freezeMap<T extends Map<unknown, unknown>>(value: T, frozenValues: WeakMap<object, object>): T {
    const guardedValue = this.guardMutations(value, FROZEN_MAP_MUTATORS);
    frozenValues.set(value, guardedValue);
    const entries: [unknown, unknown][] = Array.from(value.entries());
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      const frozenKey = this.freezeValue(entry[0], frozenValues);
      const frozenItem = this.freezeValue(entry[1], frozenValues);
      if (!Object.is(entry[0], frozenKey) || !Object.is(entry[1], frozenItem)) {
        value.delete(entry[0]);
        value.set(frozenKey, frozenItem);
      }
    }

    Object.freeze(value);
    return guardedValue;
  }

  protected static freezeSet<T extends Set<unknown>>(value: T, frozenValues: WeakMap<object, object>): T {
    const guardedValue = this.guardMutations(value, FROZEN_SET_MUTATORS);
    frozenValues.set(value, guardedValue);
    const entries: unknown[] = Array.from(value.values());
    const frozenEntries: unknown[] = [];
    let requiresReplacement = false;
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const frozenEntry = this.freezeValue(entry, frozenValues);
      frozenEntries.push(frozenEntry);
      if (!Object.is(entry, frozenEntry)) {
        requiresReplacement = true;
      }
    }
    if (requiresReplacement) {
      value.clear();
      for (let index = 0; index < frozenEntries.length; index += 1) {
        value.add(frozenEntries[index]);
      }
    }

    Object.freeze(value);
    return guardedValue;
  }

  /**
   * Return `true` when `value` should have `Object.freeze` called on it.
   *
   * Override to skip freezing specific object shapes (e.g. class instances).
   * Called once per object, after cycle detection.
   */
  protected static shouldFreeze(_value: object): boolean {
    const result = true;
    return result;
  }

  // ---------------------------------------------------------------------------
  // Public static API
  // ---------------------------------------------------------------------------

  /**
   * Recursively freeze `value` and every object reachable from it.
   *
   * Safe against circular references via WeakMap tracking. Objects and arrays retain
   * their identity; Map and Set references are mutation-guarded proxies.
   */
  public static deepFreeze<T>(value: T): T {
    const frozenValues = new WeakMap<object, object>();
    if (value instanceof Map) {
      const result = this.freezeMap(value, frozenValues);
      return result;
    }
    if (value instanceof Set) {
      const result = this.freezeSet(value, frozenValues);
      return result;
    }

    this.freezeValue(value, frozenValues);
    return value;
  }
}
