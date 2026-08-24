/**
 * Checks if a value's length/size/magnitude is shorter/less than or equal to a threshold
 */


/**
 * Checks if a value's length, size, or magnitude is less than or equal to the specified threshold
 * @param value - The value to check
 * @param threshold - The threshold to compare against
 * @returns true if value's length/size/magnitude is <= threshold, false otherwise
 *
 * Supported types:
 * - Strings: compares string.length
 * - Arrays: compares array.length
 * - Sets: compares set.size
 * - Maps: compares map.size
 * - Numbers: compares absolute value (magnitude)
 * - Objects with length property: compares obj.length
 */
export function isShorterThanOrEqual(value: unknown, threshold: number): boolean {
  // Strings and arrays
  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length <= threshold;
  }

  // Numbers - compare absolute value/magnitude
  if (typeof value === 'number') {
    return Math.abs(value) <= threshold;
  }

  // Sets and Maps
  if (value instanceof Set || value instanceof Map) {
    return value.size <= threshold;
  }

  // Objects with a length property
  if (value && typeof value === 'object' && 'length' in value) {
    const length = (value).length;

    return typeof length === 'number' && length <= threshold;
  }

  return false;
}
