/**
 * Checks if TypedArray is empty (length 0)
 */

export function isEmptyTypedArray(value: unknown): boolean {
  return ArrayBuffer.isView(value) && (value as Uint8Array).length === 0;
}
