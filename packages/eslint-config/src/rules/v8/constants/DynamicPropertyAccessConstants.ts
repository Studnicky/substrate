/** Data constants for the `dynamic-property-access` rule: the rule name, its violation message, and the built-in indexed-collection type names whose element access is exempt. */

export const RULE_NAME = 'v8Optimization/dynamicPropertyAccess';
export const MESSAGE = 'Variable-keyed property access on a plain object forces a dictionary-mode lookup. Use a Map for dynamic keys, or a literal/dot access for a known key.';

// Built-in indexed collections: element access lands in the elements backing store, not the
// hidden class, so it is exempt. The checker's isArrayType/isTupleType do not classify these, so they are matched by name.
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

// The sanctioned trust-boundary writes in @studnicky/types: `JsonObject.fromEntries`
// (construction) and `JsonObject.write` (mutation), identified by resolved declaration.
export const TRUST_BOUNDARY_OWNER = 'JsonObject';
export const TRUST_BOUNDARY_MEMBERS: ReadonlySet<string> = new Set(['fromEntries', 'write']);
export const TRUST_BOUNDARY_SOURCE_SUFFIX = 'packages/types/src/guards/JsonObject.ts';

// `Reflect.set` performs the same dynamic-keyed write as `target[key] = value` and is
// covered by the same rule.
export const REFLECT_SET_METHODS: ReadonlySet<string> = new Set(['set']);
export const REFLECT_SET_OWNERS: ReadonlySet<string> = new Set(['Reflect']);
