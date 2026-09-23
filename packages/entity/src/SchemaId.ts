export class SchemaId {
  /** Extracts a schema's `$id` when declared as a string. */
  public static of(schema: object): string | undefined {
    const id: unknown = Reflect.get(schema, '$id');
    const result = typeof id === 'string' ? id : undefined;
    return result;
  }
}
