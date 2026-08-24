/**
 * Checks if TypedArray is empty (length 0)
 */

export class IsEmptyTypedArray {
  static isEmptyTypedArray(value: unknown): boolean   {
    return ArrayBuffer.isView(value) && (value as Uint8Array).length === 0;
  }
}
