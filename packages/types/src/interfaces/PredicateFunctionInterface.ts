/** Narrows an unknown candidate to a value type. */
export interface PredicateFunctionInterface<Value> {
  (candidate: unknown): candidate is Value;
}
