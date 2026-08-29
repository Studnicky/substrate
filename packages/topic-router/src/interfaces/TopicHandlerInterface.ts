import type { TopicEnvelopeInterface } from './TopicEnvelopeInterface.js';

export interface TopicHandlerInterface<TPayload> {
  (envelope: TopicEnvelopeInterface<TPayload>): void | Promise<void>;
}
