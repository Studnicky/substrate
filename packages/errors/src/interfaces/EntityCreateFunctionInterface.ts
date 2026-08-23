/** Creates a validated entity from a partial value. */
export interface EntityCreateFunctionInterface<TEntity> {
  (partial?: Partial<TEntity>): TEntity;
}
