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
 * Global platform class names an identifier is allowed to end with even when a camelCase token
 * inside that name matches a banned shortening — `URLSearchParams` is the actual runtime class
 * (`instanceof URLSearchParams`), not an author-chosen abbreviation of "parameters", and
 * `isURLSearchParams`/the type reference `URLSearchParams` have no compliant rewrite: renaming
 * either breaks the reference to the real global.
 */
export const EXTERNAL_GLOBAL_TYPE_NAME_SUFFIXES: readonly string[] = ['URLSearchParams'];
