/** One schema resource: the document it lives in, the JSON Pointer to its root node, and the base URI in effect before its own `$id` was applied. */
export interface SchemaResourceInterface {
  readonly 'document': unknown;
  readonly 'parentBase': string;
  readonly 'pointerPrefix': string;
}
