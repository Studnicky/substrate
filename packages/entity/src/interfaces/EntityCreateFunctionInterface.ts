/** Builds a validated entity from trusted partial data, filling declared defaults. `TInput` carries no constraint brand; `TStatic` does. */
export interface EntityCreateFunctionInterface<TStatic, TInput = TStatic> {
  (partial?: Partial<TInput>): TStatic;
}
