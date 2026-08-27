/** Temporal granularity levels for grouping date values. */
export enum DateGranularity {
  'DAY' = 'day',
  'MONTH' = 'month',
  'QUARTER' = 'quarter',
  'WEEK' = 'week',
  'YEAR' = 'year'
}

/** Strategies for partitioning numeric data into groups. */
export enum GroupingStrategy {
  'DISTRIBUTIVE' = 'distributive',
  'QUANTILE' = 'quantile'
}

/** Enumeration of supported property types for value classification. */
export enum PropertyType {
  'DATE' = 'date',
  'IP' = 'ip',
  'NUMBER' = 'number',
  'SEMVER' = 'semver',
  'STRING' = 'string'
}
