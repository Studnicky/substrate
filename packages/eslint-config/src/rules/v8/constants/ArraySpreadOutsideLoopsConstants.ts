/** Data constants for the `array-spread-outside-loops` rule: the rule name and its violation message. */

export const RULE_NAME = 'v8Optimization/arraySpreadOutsideLoops';
export const MESSAGE = 'Never use array spread in loops. It creates O(n^2) work.';
