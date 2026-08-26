/**
 * Data constants for the `explicit-return-binding` rule: the TS wrapper node
 * types stripped before classifying a return argument, and the argument-node
 * types that count as "an operation whose result must be named" — see
 * `explicitReturnBinding.ts` for the survey evidence behind exactly this set.
 * (No fixer-support constants here — the rule ships no autofixer; see that
 * file's "NO FIXER" note for why.)
 */

// Cast/assertion wrappers carry no computation of their own — strip and
// classify the expression underneath, same convention as
// `TrivialExpression.isTrivial` and `folderContentShape.ts`'s `DeclaratorName.unwrapTsExpression`.
export const TS_WRAPPER_EXPRESSION_TYPES: ReadonlySet<string> = new Set([
  'TSAsExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion'
]);

// Node types whose return must be bound to a `const` first. Every member here
// represents an OPERATION — a call, an optional-chained call, or an
// operator applied to operands — as opposed to a plain reference, a literal,
// a field read, or the construction of a new value (object/array/class
// instance), all of which the survey in `explicitReturnBinding.ts` found
// consistently returned unbound throughout the 109-file sample.
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
