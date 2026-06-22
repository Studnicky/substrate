/** Compact rollup of deduplicated paths and keywords with a total error count. */
export type ValidationAggregateViewType = {
  readonly 'count': number;
  readonly 'keywords': readonly string[];
  readonly 'paths': readonly string[];
};
