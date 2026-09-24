/**
 * Pairs a schema literal with its own precomputed derived type, TypeBox-style.
 * A parent node reaches a child's derived type by indexing `static` rather
 * than recursively walking the child's `schema`, so type-checking a property
 * access resolves only the node actually touched.
 *
 * @module
 */
export interface SchemaNodeInterface<TSchema, TStatic> {
  readonly 'schema': TSchema;
  /** Phantom — carries `TStatic` for `NodeStaticType` to read; never assigned at runtime. */
  readonly 'static'?: TStatic;
}
