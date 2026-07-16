// json-schema-uninexpressible: generic type parameters (TState, TEffect) — the caller-supplied state/effect shapes are unbounded
export type FsmStepType<TState, TEffect = never> = {
  'effects': TEffect[];
  'state': TState;
};
