export class SchemaId {
  /** Extracts a schema's `$id` when declared as a string; a boolean schema has none. */
  public static of(schema: object | boolean): string | undefined {
    const id: unknown = typeof schema === 'object' ? Reflect.get(schema, '$id') : undefined;
    const result = typeof id === 'string' ? id : undefined;
    return result;
  }
}
