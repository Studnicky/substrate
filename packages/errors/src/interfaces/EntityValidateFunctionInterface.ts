/** Validates untrusted input as an entity value. */
export interface EntityValidateFunctionInterface<TEntity> {
  (candidate: unknown): candidate is TEntity;
}
