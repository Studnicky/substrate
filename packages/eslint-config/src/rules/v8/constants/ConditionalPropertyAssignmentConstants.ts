/** Data constants for the `conditional-property-assignment` rule: rule name and violation message. */

export const RULE_NAME = 'v8Optimization/conditionalPropertyAssignment';

export const MESSAGE = 'Conditional property assignment on `this` establishes DIFFERENT properties across branches (or establishes a property in only one branch), so instances diverge in hidden-class shape. Assign the SAME set of properties on every branch — see the rule source for the %HaveSameMap evidence distinguishing this from the same-property case, which is exempt.';
