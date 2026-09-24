import { DURATION_STRUCTURE_PATTERN } from '../constants/format/CalendarFormatPatterns.js';

/** Validates JSON Schema `duration` format against the RFC 3339 Appendix A `duration` ABNF. */
export class DurationFormatValidator {
  /** Tests whether `value` matches `"P" (dur-date / dur-time / dur-week)`, ordering designators and requiring `T` only when time components are present. */
  public static test(value: string): boolean {
    const match = DURATION_STRUCTURE_PATTERN.exec(value);
    const result = match !== null;
    return result;
  }
}
