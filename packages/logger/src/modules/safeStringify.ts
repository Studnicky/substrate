/**
 * Safely stringifies an object to JSON, handling circular references
 */
import { Predicates } from '@studnicky/types';

export class SafeStringify {
  /**
   * @param object - The object to stringify
   * @returns JSON string representation, with '[Circular]' replacing circular references
   */
  public static stringify(object: unknown): string {
    const seen = new WeakSet();

    const result = JSON.stringify(object, (_key, value) => {
      if (Predicates.isObjectLike(value)) {
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
