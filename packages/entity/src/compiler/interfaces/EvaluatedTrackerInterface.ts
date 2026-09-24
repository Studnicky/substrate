/** Property keys and array indices evaluated so far along one validation path, for `unevaluated*`. */
export interface EvaluatedTrackerInterface {
  readonly 'items': Set<number>;
  readonly 'properties': Set<string>;
}
