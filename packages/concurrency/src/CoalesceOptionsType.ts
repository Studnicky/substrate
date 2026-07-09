/** Construction options for `Coalesce`. */
export type CoalesceOptionsType = {
  /** Per-caller ceiling in ms on waiting for the in-flight promise. Unset means no timeout — unbounded wait. */
  'timeout'?: number;
};
