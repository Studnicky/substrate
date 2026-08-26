/** Parses untrusted input into a validated entity. The one way unparsed data becomes a `Type`. */
export interface EntityIntakeFunctionInterface<TEntity> {
  (input: unknown): TEntity;
}
