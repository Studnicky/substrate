/** Data constants for the `export-shape` rule: index-file basenames, the topology folder names that impose a naming convention on their contents, and the word-splitting / SCREAMING_SNAKE_CASE matchers used to validate exported names. */

export const INDEX_FILES: ReadonlySet<string> = new Set([
  'index.cts',
  'index.mts',
  'index.ts',
  'index.tsx'
]);

export const CANONICAL_INDEX_BASES: ReadonlySet<string> = new Set([
  'index.js',
  'index.mjs',
  'index.mts',
  'index.ts'
]);

export const RESTRICTED_TOPOLOGY_NAMES = [
  'constants',
  'entities',
  'errors',
  'interfaces',
  'types'
] as const;

export const SCREAMING_SNAKE_CASE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/u;

export const WORD_REGEX = /[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/gv;
