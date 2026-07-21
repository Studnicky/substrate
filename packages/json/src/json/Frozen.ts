import { FrozenMutationError } from '../errors/FrozenMutationError.js';
import { FROZEN_MAP_MUTATORS, FROZEN_SET_MUTATORS } from './constants/FrozenConstants.js';

/**
 * Frozen — cycle-safe recursive deep freeze.
 *
 * Recursively freezes objects and their nested values, using a WeakSet to handle
 * circular references safely.
 *
 * Subclass `Frozen` and override `protected static freezeValue` or
 * `shouldFreeze` to customise freeze behaviour.
 */

export class Frozen {
  // ---------------------------------------------------------------------------
  // Protected steps — override in subclasses to customise freezing
  // ---------------------------------------------------------------------------

  /** Build the `get` trap for a mutation-guarded Map/Set `Proxy`, bound to `target` and `mutators`. */
  protected static createMutationGetTrap<T extends object>(target: T, mutators: ReadonlySet<PropertyKey>): (source: T, prop: PropertyKey) => unknown {
    return (source, prop) => {
      const value: unknown = Reflect.get(source, prop, source);

      if (mutators.has(prop)) {
        return (): never => {
          throw new FrozenMutationError(`Cannot call "${String(prop)}" on a frozen ${target.constructor.name}`, String(prop));
        };
      }

      return typeof value === 'function' ? value.bind(source) : value;
    };
  }

  /** Wrap a Map/Set in a `Proxy` that throws `FrozenMutationError` on mutating method calls. */
  protected static guardMutations<T extends object>(target: T, mutators: ReadonlySet<PropertyKey>): T {
    return new Proxy(target, {
      'get': this.createMutationGetTrap(target, mutators)
    });
  }

  /**
   * Recurse into and freeze a single value.
   * Delegates object-freeze decision to `this.shouldFreeze`.
   */
  protected static freezeValue<T>(value: T, seen: WeakSet<object>): T {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (seen.has(value)) {
      return value;
    }

    seen.add(value);

    if (value instanceof Map) {
      Object.freeze(value);
      for (const v of value.values()) {
        this.freezeValue(v, seen);
      }

      return this.guardMutations(value, FROZEN_MAP_MUTATORS);
    }

    if (value instanceof Set) {
      Object.freeze(value);
      for (const v of value.values()) {
        this.freezeValue(v, seen);
      }

      return this.guardMutations(value, FROZEN_SET_MUTATORS);
    }

    if (this.shouldFreeze(value)) {
      Object.freeze(value);
    }

    if (Array.isArray(value)) {
      const items = Array.from<unknown>(value);
      const objLen = items.length;
      for (let i = 0; i < objLen; i += 1) {
        this.freezeValue(items[i], seen);
      }
    } else {
      const children = Object.values(value);
      const childLen = children.length;
      for (let i = 0; i < childLen; i += 1) {
        this.freezeValue(children[i], seen);
      }
    }

    return value;
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
   * Safe against circular references (via WeakSet tracking).
   * Returns the same reference, frozen in place.
   */
  public static deepFreeze<T>(value: T): T {
    const result = this.freezeValue(value, new WeakSet());
    return result;
  }
}
