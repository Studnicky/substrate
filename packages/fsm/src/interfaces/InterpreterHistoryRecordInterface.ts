export interface InterpreterHistoryRecordInterface<TState, TEvent> {
  readonly 'event': TEvent;
  readonly 'from': TState;
  /** Computed internally from the configured clock, never externally validated. */
  readonly 'timestamp': number;
  readonly 'to': TState;
}
