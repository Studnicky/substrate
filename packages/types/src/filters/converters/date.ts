/**
 * @module parseDate
 * @description Date parsing with multiple format support
 */


/**
 * Parses a date value with support for multiple formats
 * @param {*} value - Date value (string, number, Date object)
 * @param {Logger} [logger] - Optional logger instance (defaults to console)
 * @returns {Date|null} Parsed Date object or null if invalid
 */
function parseDate(value: unknown): Date | null {
  // Handle null, undefined, and other falsy primitives
  if (value === null || value === undefined || value === false || value === '') {
    return null;
  }

  // Handle Date objects
  if (value instanceof Date) {
    const timeValue = value.getTime();

    if (Number.isNaN(timeValue)) {
      return null;
    }

    return value;
  }

  // Handle numeric timestamps (Unix or epoch)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }

    // Distinguish between Unix timestamps (seconds) and epoch timestamps (milliseconds)
    // Unix timestamps are typically 10 digits (until year 2286)
    // Epoch milliseconds are typically 13 digits (until year 2286)
    // We'll consider anything less than 10000000000 as Unix timestamp (seconds)
    // This covers dates from 1970-01-01 to 2286-11-20
    let timestamp = value;

    // Convert Unix timestamp (seconds) to milliseconds
    if (Math.abs(value) < 10000000000) {
      timestamp = value * 1000;
    }

    const date = new Date(timestamp);
    const timeValue = date.getTime();

    if (Number.isNaN(timeValue)) {
      return null;
    }

    return date;
  }

  // Handle string dates (but reject empty strings)
  if (typeof value === 'string') {
    if (value.trim() === '') {
      return null;
    }

    const trimmedValue = value.trim();

    // Check if it's a numeric string (potential timestamp)
    if (/^-?\d+$/.test(trimmedValue)) {
      const numValue = parseInt(trimmedValue, 10);

      // Recursively call with numeric value to handle Unix/epoch logic
      return parseDate(numValue);
    }

    // Check for time-only strings (HH:MM or HH:MM:SS format)
    const timeOnlyRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    const timeMatch = trimmedValue.match(timeOnlyRegex);

    if (timeMatch) {
      const hours = parseInt(timeMatch[1] ?? '0', 10);
      const minutes = parseInt(timeMatch[2] ?? '0', 10);
      const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

      // Validate time components
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
        // Create a date object using TODAY's date and the specified time
        const today = new Date();
        const date = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          hours,
          minutes,
          seconds,
          0 // milliseconds
        );

        return date;
      }

      // Invalid time components - return null, don't fall through
      return null;
    }

    // Try regular date parsing
    const date = new Date(trimmedValue);
    const timeValue = date.getTime();

    if (Number.isNaN(timeValue)) {
      return null;
    }

    return date;
  }

  // Reject all other types (objects, arrays, functions, symbols, bigints, etc.)
  return null;
}

export { parseDate };
