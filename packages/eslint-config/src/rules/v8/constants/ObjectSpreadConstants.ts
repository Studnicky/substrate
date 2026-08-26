/** Data constants for the `object-spread` rule: rule name and violation message. */

export const RULE_NAME = 'v8Optimization/objectSpread';

export const MESSAGE = 'Object spread / Object.assign at construction time allocates a throwaway-shaped intermediate (measured ~57x slower creation than a direct object literal at 5,000,000 calls) and — for Object.assign(this, source) specifically — merges a variable key set directly onto the instance being constructed, diverging its own hidden class across calls. See the rule source for the %HaveSameMap evidence and why a purely local spread that never reaches `this` is exempt.';
