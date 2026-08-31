export interface StateCodecInterface<TState> {
  'decode': (serialized: string) => TState;
  'encode': (state: TState) => string;
}
