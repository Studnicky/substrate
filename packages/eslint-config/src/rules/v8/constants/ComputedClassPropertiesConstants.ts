/** Data constants for the `computed-class-properties` rule: rule name and violation message. */

export const RULE_NAME = 'v8Optimization/computedClassProperties';

export const MESSAGE = 'A computed class member key that is neither a literal nor a well-known symbol, declared inside a function/loop that can re-evaluate the class, produces a genuinely different runtime class per call — measured 3x slower field access once such instances are pooled and read polymorphically. See the rule source for the %HaveSameMap evidence and the reproduction command.';
