/** Data constants for the `dynamic-property-access` rule: the rule name, its violation message, and the built-in indexed-collection type names whose element access is exempt. */

export const RULE_NAME = 'v8Optimization/dynamicPropertyAccess';
export const MESSAGE = 'Variable-keyed property access on a plain object forces a dictionary-mode lookup. Use a Map for dynamic keys, or a literal/dot access for a known key.';

/**
 * Built-in indexed collections. Element access on these lands in the elements
 * backing store, never in the hidden class, so it is exempt — see the rule source
 * for the `%DebugPrint` evidence. TypeScript's checker classifies `T[]`/tuples via
 * `isArrayType`/`isTupleType`, but does NOT classify these as array types, so they
 * must be matched by symbol name.
 */
export const INDEXED_COLLECTION_NAMES: ReadonlySet<string> = new Set([
  'BigInt64Array',
  'BigUint64Array',
  'DataView',
  'Float32Array',
  'Float64Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array'
]);
