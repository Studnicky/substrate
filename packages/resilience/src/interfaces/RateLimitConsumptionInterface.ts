/** Result of a token consumption. Computed internally from live counters; never externally validated. */
export interface RateLimitConsumptionInterface {
  readonly 'consumedTokens': number;
  readonly 'remainingTokens': number;
}
