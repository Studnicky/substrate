import type { InterpreterHistoryRecordMetadataEntity } from './entities/InterpreterHistoryRecordMetadataEntity.js';

export interface InterpreterHistoryRecordInterface<TState, TEvent> {
  readonly 'event': TEvent;
  readonly 'from': TState;
  readonly 'timestamp': InterpreterHistoryRecordMetadataEntity.Type['timestamp'];
  readonly 'to': TState;
}
