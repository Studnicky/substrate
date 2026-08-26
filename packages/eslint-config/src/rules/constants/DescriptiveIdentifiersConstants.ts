/** Data constants for the `descriptive-identifiers` rule: the banned shorthand tokens and the pattern used to recognize a quoted object key as a valid JavaScript identifier (as opposed to a foreign string key, e.g. a rule id or URL). */

export const BANNED_SHORTENINGS = new Set([
  'args',
  'arr',
  'buf',
  'cb',
  'cfg',
  'cnt',
  'conf',
  'ctx',
  'curr',
  'dlq',
  'doc',
  'dst',
  'env',
  'err',
  'fn',
  'idx',
  'kv',
  'len',
  'lst',
  'max',
  'mgr',
  'min',
  'mq',
  'msg',
  'num',
  'nxt',
  'obj',
  'opts',
  'params',
  'prev',
  'ptr',
  'rcv',
  'ref',
  'repo',
  'ret',
  'snd',
  'src',
  'str',
  'svc',
  'tmp',
  'util',
  'utils',
  'val'
]);

export const IDENTIFIER_NAME_PATTERN = /^[A-Za-z_$][\w$]*$/u;

/**
 * JSON Schema vocabulary keywords. These are EXTERNAL SPEC identifiers, not names the
 * author chose, so the banned-shortening check must not apply to them: renaming
 * `'minLength'` inside a Schema does not rename a variable, it silently breaks
 * validation, and there is no compliant rewrite. Same reasoning as the ESLint rule-ID
 * exemption — a key that belongs to someone else's vocabulary is data, not an identifier.
 */
export const EXTERNAL_VOCABULARY_KEYS: ReadonlySet<string> = new Set([
  'additionalItems', 'additionalProperties', 'exclusiveMaximum', 'exclusiveMinimum',
  'maxContains', 'maximum', 'maxItems', 'maxLength',
  'maxProperties', 'minContains', 'minimum', 'minItems',
  'minLength', 'minProperties', 'multipleOf', 'patternProperties',
  'propertyNames', 'unevaluatedItems', 'unevaluatedProperties', 'uniqueItems'
]);

/**
 * Global platform class names an identifier is allowed to end with even when a camelCase token
 * inside that name matches a banned shortening — `URLSearchParams` is the actual runtime class
 * (`instanceof URLSearchParams`), not an author-chosen abbreviation of "parameters", and
 * `isURLSearchParams`/the type reference `URLSearchParams` have no compliant rewrite: renaming
 * either breaks the reference to the real global. Same reasoning as `EXTERNAL_VOCABULARY_KEYS` —
 * a name that belongs to someone else's vocabulary is a reference, not an identifier choice.
 */
export const EXTERNAL_GLOBAL_TYPE_NAME_SUFFIXES: readonly string[] = ['URLSearchParams'];
