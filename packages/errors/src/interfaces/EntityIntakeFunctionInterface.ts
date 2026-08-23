/** Parses untrusted input into a validated entity. */
export interface EntityIntakeFunctionInterface<TEntity> {
  (input: unknown): TEntity;
}
