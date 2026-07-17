/**
 * Request body serialization utilities as static class methods
 */

/**
 * Serializes request bodies to a form suitable for the native/undici fetch API
 * and determines whether a JSON Content-Type header should be auto-set.
 *
 * Shared between `FetchClient` and `HttpMethods` so both entry points
 * (the configured client and the standalone static methods) serialize
 * bodies identically.
 */
export class BodySerializer {
  /**
   * Determines whether Content-Type header should be auto-set to application/json
   * Returns true for plain objects/arrays (not Buffer, ArrayBuffer, or ArrayBufferView)
   *
   * @param body - Request body to check
   * @returns True if Content-Type should be set
   */
  static needsJsonContentType(body: unknown): boolean {
    return typeof body === 'object'
      && body !== null
      && !(body instanceof Buffer)
      && !(body instanceof ArrayBuffer)
      && !ArrayBuffer.isView(body);
  }

  /**
   * Serializes body to a form suitable for the native fetch API
   * - undefined/null: no body
   * - string: passed as-is
   * - Buffer/ArrayBuffer/ArrayBufferView: passed as-is (binary)
   * - any other value: JSON.stringify
   */
  static serialize(body: unknown): ArrayBuffer | string | Uint8Array | undefined {
    if (body === undefined || body === null) {
      return undefined;
    }

    if (typeof body === 'string') {
      return body;
    }

    if (body instanceof Buffer || body instanceof ArrayBuffer) {
      return body;
    }

    if (ArrayBuffer.isView(body)) {
      return body as Uint8Array;
    }

    return JSON.stringify(body);
  }
}
