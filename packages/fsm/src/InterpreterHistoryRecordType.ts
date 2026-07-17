// json-schema-uninexpressible: generic type parameters (TState, TEvent) — the caller-supplied state/event shapes are unbounded
export type InterpreterHistoryRecordType<TState, TEvent> = {
  'event': TEvent;
  'from': TState;
  'timestamp': number;
  'to': TState;
};
