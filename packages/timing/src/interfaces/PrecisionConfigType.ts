/**
 * Configuration for decimal precision per time unit.
 *
 * @public
 */
export type PrecisionConfigType = {
  /**
   * Maximum number of decimal places for hours.
   * @defaultValue 6
   */
  'h'?: number;

  /**
   * Maximum number of decimal places for minutes.
   * @defaultValue 6
   */
  'm'?: number;

  /**
   * Maximum number of decimal places for milliseconds.
   * Values are rounded using mathematical rounding.
   * @defaultValue 3
   */
  'ms'?: number;

  /**
   * Maximum number of decimal places for nanoseconds.
   * @defaultValue 0
   */
  'ns'?: number;

  /**
   * Maximum number of decimal places for seconds.
   * @defaultValue 6
   */
  's'?: number;
};
