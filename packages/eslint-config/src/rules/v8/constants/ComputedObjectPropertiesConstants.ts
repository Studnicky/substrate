/** Data constants for the `computed-object-properties` rule: rule name and violation message. */

export const RULE_NAME = 'v8Optimization/computedObjectProperties';

export const MESSAGE = 'A computed property in an object literal (or Object.fromEntries) bypasses the fast boilerplate-clone path V8 uses for object literals whose shape is fully known at compile time. Measured 13-22x slower creation at 5,000,000 calls — see the rule source for the reproduction command and why well-known symbols are exempt anyway.';
