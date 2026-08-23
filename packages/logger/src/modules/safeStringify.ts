/**
 * Safely stringifies an object to JSON, handling circular references
 */
export class SafeStringify {
  /**
   * @param object - The object to stringify
   * @returns JSON string representation, with '[Circular]' replacing circular references
   */
  public static stringify<T>(object: T): string {
    const seen = new WeakSet();

    const result = JSON.stringify(object, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }

      return value;
    });
    return result;
  }
}
