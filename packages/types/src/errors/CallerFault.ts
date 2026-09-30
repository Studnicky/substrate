/**
 * The sanctioned pass-through channel for errors raised by caller-supplied code.
 *
 * Every error a substrate package emits is a named `BaseError` subclass. The one exception is an
 * error thrown by a callback the consumer passed in (a task, hook, or reducer): that error belongs
 * to the caller and reaches the caller unchanged. `CallerFault.propagate` is the single place such
 * a value is rethrown and `CallerFault.rejection` the single place it rejects a promise, so the
 * `no-native-error` rule can exempt exactly these methods.
 *
 * Library-originated errors and platform errors must never pass through it: construct a named
 * `BaseError` subclass instead, and wrap a platform error with the original as `cause`.
 */
export class CallerFault {
  /**
   * Throws `value` unchanged. Use only for an error raised by caller-supplied code.
   */
  public static propagate(value: unknown): never {
    throw value;
  }

  /**
   * Returns a promise rejected with `value` unchanged. Use only to reject a pending promise with an
   * error raised by caller-supplied code; library-originated and platform errors are named
   * `BaseError` subclasses instead.
   */
  public static rejection(value: unknown): Promise<never> {
    const result = new Promise<never>((_resolve, reject) => {
      reject(value);
    });

    return result;
  }
}
