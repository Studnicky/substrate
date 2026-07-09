/**
 * @packageDocumentation
 * Bounded work dispatch pattern composing `@studnicky/concurrency`'s `Semaphore`,
 * `@studnicky/event-bus`'s `EventBus`, and `@studnicky/scheduler`.
 */
export { BoundedDispatcher } from './BoundedDispatcher.js';
export { BoundedDispatcherBuilder } from './BoundedDispatcherBuilder.js';
export type { BoundedDispatcherConfigType } from './types/BoundedDispatcherConfigType.js';
export type { BoundedDispatcherEventType } from './types/BoundedDispatcherEventType.js';
export type {
  BoundedDispatcherComposedTopicMapType,
  BoundedDispatcherTopicMapType
} from './types/BoundedDispatcherTopicMapType.js';
