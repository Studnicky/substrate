export interface FsmStepInterface<TState, TEffect = never> {
  readonly 'effects': readonly TEffect[];
  readonly 'state': TState;
}
