/** Contravariant-position trick: a function parameter union infers as an intersection. */
export type UnionToIntersectionType<TUnion> = (TUnion extends unknown ? (k: TUnion) => void : never) extends (k: infer TIntersection) => void
  ? TIntersection
  : never;
