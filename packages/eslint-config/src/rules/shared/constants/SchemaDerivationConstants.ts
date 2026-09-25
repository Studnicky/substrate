/** Schema-derivation shapes accepted by `SchemaMemberGuards`, `TypeContractContext`, and
 * `allTypesAreEntities` — one source of truth so the three call sites cannot drift. */

/** The identifier name of the schema-owning value a `Type` derives from, e.g. `typeof Schema` or `typeof Node`. */
export const ACCEPTED_SCHEMA_VALUE_NAMES: ReadonlySet<string> = new Set([
  'Node',
  'Schema'
]);

/** The member name of an entity namespace's own canonical schema-derived export — the
 * validated `Type` and its unvalidated `InputType` counterpart. */
export const CANONICAL_ENTITY_MEMBER_NAMES: ReadonlySet<string> = new Set([
  'InputType',
  'Type'
]);

/** Deriving-type name mapped to the module it must resolve to, proving provenance.
 * Its key set is the accepted deriving-type-name set. */
export const SCHEMA_DERIVING_TYPE_MODULES: ReadonlyMap<string, string> = new Map([
  ['NodeInputType', '@studnicky/entity/types'],
  ['NodeStaticType', '@studnicky/entity/types']
]);

/** JSON Schema keywords that make a schema's constraint sound but not structurally derivable —
 * `not` and `if`/`then`/`else` used as a discriminant. Only these permit a hand-written `Type`. */
export const DISCRIMINANT_DEFEATING_SCHEMA_KEYS: ReadonlySet<string> = new Set([
  'else',
  'if',
  'not',
  'then'
]);
