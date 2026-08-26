/**
 * Checks if TypedArray is empty (length 0)
 */

export class IsEmptyTypedArray {
  static isEmptyTypedArray(value: unknown): boolean   {
    const result = ArrayBuffer.isView(value) && (value as Uint8Array).length === 0;
    return result;
  }
}
