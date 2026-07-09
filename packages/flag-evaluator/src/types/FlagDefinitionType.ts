/**
 * FlagDefinitionType — the shape registered under a flag name via `FlagEvaluator#register()`.
 */

export type FlagDefinitionType = {
  /**
   * The value returned when `enabled` is `false`. Has no effect while `enabled` is `true` —
   * an enabled flag with no matching rollout bucket resolves to `false`, not `defaultValue`.
   */
  'defaultValue': boolean;
  /** Whether the flag is enabled at all. `false` short-circuits straight to `defaultValue`. */
  'enabled': boolean;
  /**
   * Percentage (0-100) of deterministic buckets that resolve to `true` while `enabled` is
   * `true`. Omitted means `100` — fully enabled for everyone once `enabled` is `true`.
   */
  'rolloutPercent'?: number;
};
