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

  /**
   * Recurse into and freeze a single value.
   * Delegates object-freeze decision to `this.shouldFreeze`.
   */
  protected static freezeValue<T>(value: T, seen: WeakSet<object>): T {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    const obj = value as object;

    if (seen.has(obj)) {
      return value;
    }

    seen.add(obj);

    if (this.shouldFreeze(obj)) {
      Object.freeze(obj);
    }

    if (Array.isArray(obj)) {
      const objLen = (obj as unknown[]).length;
      for (let i = 0; i < objLen; i += 1) {
        this.freezeValue((obj as unknown[])[i], seen);
      }
    } else {
      const children = Object.values(obj);
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
