/** Builds a validated entity from trusted partial data, filling declared defaults. */
export interface EntityCreateFunctionInterface<TEntity> {
  (partial?: Partial<TEntity>): TEntity;
}
