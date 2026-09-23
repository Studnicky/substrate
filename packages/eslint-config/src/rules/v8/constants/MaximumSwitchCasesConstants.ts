/** Data constants for the `max-switch-cases` rule: the per-discriminant-type case-count thresholds and the block-like AST node types that scope sibling-switch aggregation. */

// No cap: an int-keyed switch is never meaningfully slower than a dispatch map.
// Benchmark and bytecode proof: docs/eslint/rules/v8/max-switch-cases.md.
export const MAXIMUM_INT_SWITCH_CASES: number | null = null;

// Crossover count where a dispatch map starts winning over a string-keyed switch.
// Benchmark table: docs/eslint/rules/v8/max-switch-cases.md.
export const MAXIMUM_STRING_SWITCH_CASES = 6;

// Conservative, unproven fallback for labels that are neither all-integer nor
// all-string literals (booleans, computed member access, mixed, unresolvable).
export const MAXIMUM_SWITCH_CASES_DEFAULT = 20;

export const BLOCK_TYPES: ReadonlySet<string> = new Set([
  'BlockStatement',
  'Program',
  'StaticBlock',
  'SwitchCase'
]);
