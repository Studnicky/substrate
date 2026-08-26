/** Data constants for the `max-switch-cases` rule: the per-discriminant-type case-count thresholds and the block-like AST node types that scope sibling-switch aggregation. */

// Dense-integer-keyed switches get NO cap: measured (Node v24, N = 5,000,000
// dispatches, 3 warm-ups + median of 7) at every count 3/10/20/50/100, an
// int-keyed switch is never meaningfully slower than an equivalent dispatch
// map (worst case 1.02x at 10 cases, within noise; often 2-5x FASTER). V8
// compiles a Smi-keyed switch to `SwitchOnSmiNoFeedback`, a jump table, at
// any of these sizes — see `switchStatements.ts` for the bytecode proof that
// case-body size does not change this. NOT separately measured: whether this
// still holds for a SPARSE integer range (e.g. HTTP status codes with large
// gaps) rather than the dense 0..N-1 labels used here — treated the same,
// unproven for that shape.
export const MAXIMUM_INT_SWITCH_CASES: number | null = null;

// String-keyed switches cross over MUCH earlier than integer ones, because
// V8 does not have an equivalent O(1) jump table for string discriminants —
// dispatch degrades toward a comparison chain as case count grows. Measured
// (Node v24, N = 5,000,000 dispatches, 3 warm-ups + median of 7), with the
// dispatch map arm holding FUNCTIONS (`Record<key, handler>`, each handler
// called at the dispatch site) — the map arm must call, not merely look up
// and return a value, because that per-dispatch call is what the rule
// actually tells an author to build and is what makes the crossover land
// here rather than earlier:
//   cases   switch      map    winner
//       3     28.8     55.9    switch 1.94x
//       4     46.7     58.7    switch 1.26x
//       5     53.6     59.1    switch 1.10x
//       6     59.4     58.8    MAP    1.01x   <- crossover
//       8     75.6     59.6    MAP    1.27x
//      10     83.4     54.9    MAP    1.52x
// At 4 and 5 cases the switch is still measurably faster, so a threshold
// below 6 would order authors to replace a faster construct with a slower
// one. Threshold set at the first count where the map wins.
export const MAXIMUM_STRING_SWITCH_CASES = 6;

// Fallback for a discriminant that classifies as neither all-integer-literal
// nor all-string-literal case labels (booleans, enum members via computed
// member access, mixed literal types, or non-literal case tests that
// `DiscriminantKey` cannot resolve). UNPROVEN for this catch-all category —
// inherited from the rule's original single threshold rather than freshly
// measured, since there is no single representative discriminant shape to
// benchmark here. Kept conservative (same value as before this rule was
// split by discriminant type).
export const MAXIMUM_SWITCH_CASES_DEFAULT = 20;

export const BLOCK_TYPES: ReadonlySet<string> = new Set([
  'BlockStatement',
  'Program',
  'StaticBlock',
  'SwitchCase'
]);
