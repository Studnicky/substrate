/** Construction options for `Channel`. */
export type ChannelOptionsType = {
  /** Per-key buffer depth at which `onOverflow` fires. Unset means unbounded — no check performed. */
  'highWaterMark'?: number;
};
