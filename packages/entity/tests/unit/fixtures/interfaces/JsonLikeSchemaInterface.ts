/** Schema shape of a recursive JSON-like value: a union of JSON leaf, array, and object branches. */
export interface JsonLikeSchemaInterface {
  readonly 'anyOf': readonly unknown[];
}
