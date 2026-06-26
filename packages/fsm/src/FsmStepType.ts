export type FsmStepType<TState, TEffect = never> = {
  'effects': TEffect[];
  'state': TState;
};
