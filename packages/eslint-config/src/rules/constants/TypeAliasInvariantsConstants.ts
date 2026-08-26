/** Data constants for the `type-alias-invariants` rule: the matchers used to locate a `readonly` modifier token, the primitive TS keyword node types that make a type alias a forbidden primitive wrapper, and their display names for the diagnostic message. */

export const READONLY_KEYWORD_PATTERN = /\breadonly\b/u;

export const TRAILING_PLUS_PATTERN = /\+\s*$/u;

export const PRIMITIVE_TYPES: ReadonlySet<string> = new Set([
  'TSAnyKeyword',
  'TSBigIntKeyword',
  'TSBooleanKeyword',
  'TSNeverKeyword',
  'TSNullKeyword',
  'TSNumberKeyword',
  'TSStringKeyword',
  'TSSymbolKeyword',
  'TSUndefinedKeyword',
  'TSUnknownKeyword',
  'TSVoidKeyword'
]);

export const PRIMITIVE_DISPLAY_NAMES: ReadonlyMap<string, string> = new Map([
  [
    'TSAnyKeyword',
    'any'
  ],
  [
    'TSBigIntKeyword',
    'bigint'
  ],
  [
    'TSBooleanKeyword',
    'boolean'
  ],
  [
    'TSNeverKeyword',
    'never'
  ],
  [
    'TSNullKeyword',
    'null'
  ],
  [
    'TSNumberKeyword',
    'number'
  ],
  [
    'TSStringKeyword',
    'string'
  ],
  [
    'TSSymbolKeyword',
    'symbol'
  ],
  [
    'TSUndefinedKeyword',
    'undefined'
  ],
  [
    'TSUnknownKeyword',
    'unknown'
  ],
  [
    'TSVoidKeyword',
    'void'
  ]
]);
