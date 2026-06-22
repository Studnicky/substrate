export type FsmStepType<TState, TEffect = never> = {
  readonly 'effects': readonly TEffect[];
  readonly 'state': TState;
};
