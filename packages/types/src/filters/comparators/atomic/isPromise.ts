/**
 * Checks if a value is a Promise or Promise-like object
 */


/**
 * Checks if a value is a Promise or thenable object
 * @param value - The value to check
 * @returns true if value is a Promise, false otherwise
 */
export class IsPromise {
  static isPromise(value: unknown): boolean   {
    return value instanceof Promise
      || (value !== null
       && value !== undefined
       && typeof value === 'object'
       && typeof (value as Record<string, unknown>).then === 'function');
  }
}
