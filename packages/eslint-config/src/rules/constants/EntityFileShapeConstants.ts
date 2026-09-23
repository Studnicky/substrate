/** Data constants for the `folder-content-shape` rule: entity-file matchers, index-file basenames, and the AST node-type sets used to classify a `const` initializer as function-like, a builtin collection, or a TS wrapper expression. */

export const ENTITY_FILE_REGEX = /Entity\.[cm]?[tj]sx?$/v;
export const ENTITY_DIR_REGEX = /\/entities\//v;
export const FILE_EXTENSION_STRIP_PATTERN = /\.[cm]?[tj]sx?$/v;

export const INDEX_FILES: ReadonlySet<string> = new Set([
  'index.cts',
  'index.mts',
  'index.ts',
  'index.tsx'
]);

export const FUNCTION_LIKE_INIT_TYPES: ReadonlySet<string> = new Set([
  'ArrowFunctionExpression',
  'ClassExpression',
  'FunctionExpression'
]);

export const BUILTIN_COLLECTION_CONSTRUCTOR_NAMES: ReadonlySet<string> = new Set([
  'Map',
  'Set',
  'WeakMap',
  'WeakSet'
]);

/** Primitive-wrapper builtins (`Number(...)`, `String(...)`, `Boolean(...)`) called with a
 * literal argument produce a plain primitive data value, not a function/reference — a magic
 * constant written as `Number(3)` instead of `3` is still a magic constant. */
export const PRIMITIVE_WRAPPER_CONSTRUCTOR_NAMES: ReadonlySet<string> = new Set([
  'Boolean',
  'Number',
  'String'
]);

export const TS_WRAPPER_EXPRESSION_TYPES: ReadonlySet<string> = new Set([
  'TSAsExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion'
]);
