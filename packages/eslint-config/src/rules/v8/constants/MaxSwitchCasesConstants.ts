/** Data constants for the `max-switch-cases` rule: the case-count threshold and the block-like AST node types that scope sibling-switch aggregation. */

export const MAX_SWITCH_CASES = 20;
export const BLOCK_TYPES: ReadonlySet<string> = new Set([
  'BlockStatement',
  'Program',
  'StaticBlock',
  'SwitchCase'
]);
