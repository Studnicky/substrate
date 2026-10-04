/** JSON-compatible normalized entity collection state. */
export interface EntityStateInterface<TEntity extends object> {
  readonly 'entities': Readonly<Record<string, TEntity>>;
  readonly 'ids': readonly string[];
}
