/**
 * @packageDocumentation
 * Bounded work dispatch pattern composing `@studnicky/concurrency`'s `Semaphore`,
 * `@studnicky/event-bus`'s `EventBus`, and `@studnicky/scheduler`.
 */
export { BoundedDispatcher } from './BoundedDispatcher.js';
export { BoundedDispatcherErrorEventEntity } from './entities/BoundedDispatcherErrorEventEntity.js';
export { BoundedDispatcherStartEventEntity } from './entities/BoundedDispatcherStartEventEntity.js';
export { BoundedDispatcherSuccessEventEntity } from './entities/BoundedDispatcherSuccessEventEntity.js';
export type { BoundedDispatcherConfigInterface } from './interfaces/BoundedDispatcherConfigInterface.js';
export type { BoundedDispatcherErrorEventInterface } from './interfaces/BoundedDispatcherErrorEventInterface.js';
export type { BoundedDispatcherStartEventInterface } from './interfaces/BoundedDispatcherStartEventInterface.js';
export type { BoundedDispatcherSuccessEventInterface } from './interfaces/BoundedDispatcherSuccessEventInterface.js';
export type { BoundedDispatcherTopicMapInterface } from './interfaces/BoundedDispatcherTopicMapInterface.js';
