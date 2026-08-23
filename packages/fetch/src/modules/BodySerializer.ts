/**
 * Request body serialization utilities as static class methods
 */

/**
 * Serializes request bodies to a form suitable for the native/undici fetch API
 * and determines whether a JSON Content-Type header should be auto-set.
 *
 * Used by `FetchClient` to serialize body-bearing requests consistently.
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
    const result = typeof body === 'object'
      && body !== null
      && !(body instanceof Buffer)
      && !(body instanceof ArrayBuffer)
      && !ArrayBuffer.isView(body);
    return result;
  }

  /**
   * Serializes body to a form suitable for the native fetch API
   * - undefined/null: no body
   * - string: passed as-is
   * - ArrayBuffer: passed as-is
   * - ArrayBufferView: copied into a detached Uint8Array of the visible byte range
   * - any other value: JSON.stringify
   */
  static serialize(body: unknown): ArrayBuffer | string | Uint8Array | undefined {
    if (body === undefined || body === null) {
      const result = undefined;
      return result;
    }

    if (typeof body === 'string') {
      const result = body;
      return result;
    }

    if (body instanceof ArrayBuffer) {
      const result = body;
      return result;
    }

    if (ArrayBuffer.isView(body)) {
      const visibleBytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
      const result = Uint8Array.from(visibleBytes);
      return result;
    }

    const result = JSON.stringify(body);
    return result;
  }
}
