import type { TopicHandlerInterface } from '../interfaces/TopicHandlerInterface.js';

export interface TopicSubscriptionInterface<TPayload> {
  readonly 'attributes'?: unknown;
  readonly 'handler': TopicHandlerInterface<TPayload>;
  readonly 'id': string;
  readonly 'pattern': string;
}
