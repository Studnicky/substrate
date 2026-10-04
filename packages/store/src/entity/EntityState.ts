/** JSON-compatible normalized entity collection state. */
export class EntityState<TEntity extends object> {
  public readonly entities: Readonly<Record<string, TEntity>>;
  public readonly ids: readonly string[];

  public constructor(entities: Readonly<Record<string, TEntity>>, ids: readonly string[]) {
    this.entities = entities;
    this.ids = ids;
  }
}
