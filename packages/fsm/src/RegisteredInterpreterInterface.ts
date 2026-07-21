import type { RegisteredInterpreterMetricsEntity } from './entities/RegisteredInterpreterMetricsEntity.js';

export interface RegisteredInterpreterInterface<TState, TEvent> {
  getState(): TState;
  readonly 'hookErrorCount': RegisteredInterpreterMetricsEntity.Type['hookErrorCount'];
  send(event: TEvent): Promise<void>;
  start(): void;
  stop(): void;
}
