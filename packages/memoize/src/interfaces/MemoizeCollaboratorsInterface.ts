/** Typed collaborators `Memoize.create` accepts alongside schema-validated config. */
export interface MemoizeCollaboratorsInterface<TArgumentList extends unknown[]> {
  /** Derives the cache and coalesce key for a call from its arguments. */
  'keyDeriver': (...argumentList: TArgumentList) => string;
}
