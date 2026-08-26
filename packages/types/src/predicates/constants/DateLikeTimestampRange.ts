/**
 * Timestamp range for realistic date filtering (Jan 1, 1990 to Jan 1, 2100)
 */

export const DATE_LIKE_TIMESTAMP_RANGE = {
  /** Jan 1, 2100 00:00:00 UTC */
  'MAXIMUM': 4102444800000,
  /** Jan 1, 1990 00:00:00 UTC */
  'MINIMUM': 631152000000
} as const;
