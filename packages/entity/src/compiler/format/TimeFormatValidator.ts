import { TIME_STRUCTURE_PATTERN } from '../constants/format/CalendarFormatPatterns.js';

/** Validates JSON Schema `time` format (RFC 3339 `full-time`), including offset-relative leap-second eligibility. */
export class TimeFormatValidator {
  /** Tests whether `value` is a syntactically valid `full-time` string with a real 24-hour clock and offset. */
  public static test(value: string): boolean {
    const match = TIME_STRUCTURE_PATTERN.exec(value);
    if (match === null) {
      return false;
    }
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3]);
    if (hour > 23 || minute > 59 || second > 60) {
      return false;
    }
    const offsetMinutes = TimeFormatValidator.parseOffsetMinutes(match[4]!);
    if (offsetMinutes === undefined) {
      return false;
    }
    const result = second < 60 || TimeFormatValidator.isLeapSecondEligible(hour, minute, offsetMinutes);
    return result;
  }

  /** Parses the captured `Z`/`z` or `±hh:mm` offset token into signed minutes, rejecting an out-of-range offset. */
  private static parseOffsetMinutes(token: string): number | undefined {
    if (token.length === 1) {
      return 0;
    }
    const offsetHour = Number(token.slice(1, 3));
    const offsetMinute = Number(token.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) {
      return undefined;
    }
    const sign = token.charAt(0) === '-' ? -1 : 1;
    const result = sign * ((offsetHour * 60) + offsetMinute);
    return result;
  }

  /** A leap second (`:60`) is only real when the offset-adjusted UTC clock reads 23:59. */
  private static isLeapSecondEligible(hour: number, minute: number, offsetMinutes: number): boolean {
    const localTotalMinutes = (hour * 60) + minute;
    const utcTotalMinutes = (((localTotalMinutes - offsetMinutes) % 1440) + 1440) % 1440;
    const utcHour = Math.floor(utcTotalMinutes / 60);
    const utcMinute = utcTotalMinutes % 60;
    const result = utcHour === 23 && utcMinute === 59;
    return result;
  }
}
