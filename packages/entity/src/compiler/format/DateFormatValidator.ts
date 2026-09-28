import { DATE_STRUCTURE_PATTERN } from '../constants/format/CalendarFormatPatterns.js';

/** Validates JSON Schema `date` format (RFC 3339 `full-date`) against real Gregorian calendar arithmetic. */
export class DateFormatValidator {
  /** Tests whether `value` is a syntactically valid, calendar-real `full-date` string. */
  public static test(value: string): boolean {
    const match = DATE_STRUCTURE_PATTERN.exec(value);
    if (match === null) {
      return false;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const result = DateFormatValidator.isRealCalendarDate(year, month, day);
    return result;
  }

  /** Round-trips year/month/day through `Date.setUTCFullYear`, which never applies the two-digit-year offset and rolls overflowed components forward instead of clamping — an exact-match round trip proves the date is a real calendar day. */
  private static isRealCalendarDate(year: number, month: number, day: number): boolean {
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    const result = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    return result;
  }
}
