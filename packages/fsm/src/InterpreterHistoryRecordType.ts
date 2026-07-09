export type InterpreterHistoryRecordType<TState, TEvent> = {
  'event': TEvent;
  'from': TState;
  'timestamp': number;
  'to': TState;
};
