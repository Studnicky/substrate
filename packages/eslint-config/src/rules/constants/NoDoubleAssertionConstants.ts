/** Data constants for the `no-double-assertion` rule: the widening keyword node types an inner assertion's target must be, and the two assertion node shapes ESLint's TypeScript parser produces. */

export const WIDENING_KEYWORDS: ReadonlySet<string> = new Set(['TSAnyKeyword', 'TSUnknownKeyword']);

export const ASSERTION_TYPES: ReadonlySet<string> = new Set(['TSAsExpression', 'TSTypeAssertion']);
