/** Data constants for the `eval-function` rule: the rule name and its violation message. */

export const RULE_NAME = 'v8Optimization/evalFunction';
export const MESSAGE = 'Avoid eval() and new Function(). They break V8 optimizations and are a security risk.';
