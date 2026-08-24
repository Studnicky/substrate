/**
 * Checks if a value is an instance of a specific class/constructor
 */


/**
 * Checks if a value is an instance of the specified constructor
 * @param value - The value to check
 * @param constructor - The constructor function to check against
 * @returns true if value is an instance of constructor, false otherwise
 */
export class IsInstanceOf {
  static isInstanceOf(value: unknown, constructor: new (..._args: unknown[]) => unknown): boolean   {
    try {
      return value instanceof constructor;
    } catch {
      // Handle cases where constructor is not a valid constructor function
      return false;
    }
  }
}
