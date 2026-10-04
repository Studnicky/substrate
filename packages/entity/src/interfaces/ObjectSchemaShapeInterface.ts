/**
 * The runtime shape every JSON Schema object node carries, regardless of its
 * branded `TSchema`.
 *
 * @module
 */
export interface ObjectSchemaShapeInterface {
  readonly 'properties'?: Record<string, unknown>;
  readonly 'required'?: readonly string[];
}
