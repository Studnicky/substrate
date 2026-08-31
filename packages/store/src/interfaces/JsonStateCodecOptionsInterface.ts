export interface JsonStateCodecOptionsInterface<TState> {
  readonly 'decode': (value: unknown) => TState;
}
