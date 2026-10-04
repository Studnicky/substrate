// Data constants for `explicit-return-binding`; see explicit-return-binding.md
// for the survey evidence behind these sets.

// Cast/assertion wrappers carry no computation — strip before classifying,
// same convention as `TrivialExpression.isTrivial`.
export const TS_WRAPPER_EXPRESSION_TYPES: ReadonlySet<string> = new Set([
  'TSAsExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion'
]);

// Node types representing an operation whose result must be named before return.
export const REQUIRES_BINDING_TYPES: ReadonlySet<string> = new Set([
  'AssignmentExpression',
  'BinaryExpression',
  'CallExpression',
  'ChainExpression',
  'ConditionalExpression',
  'LogicalExpression',
  'SequenceExpression',
  'TaggedTemplateExpression',
  'UnaryExpression',
  'UpdateExpression'
]);
