import { DATE_TIME_SPLIT_PATTERN } from '../constants/format/CalendarFormatPatterns.js';
import { DateFormatValidator } from './DateFormatValidator.js';
import { TimeFormatValidator } from './TimeFormatValidator.js';

/** Validates JSON Schema `date-time` format (RFC 3339 `date-time`) by composing `full-date` and `full-time`. */
export class DateTimeFormatValidator {
  /** Tests whether `value` is `full-date "T" full-time`, with both halves independently spec-correct. */
  public static test(value: string): boolean {
    const match = DATE_TIME_SPLIT_PATTERN.exec(value);
    if (match === null) {
      return false;
    }
    const datePart = match[1]!;
    const timePart = match[2]!;
    const result = DateFormatValidator.test(datePart) && TimeFormatValidator.test(timePart);
    return result;
  }
}
