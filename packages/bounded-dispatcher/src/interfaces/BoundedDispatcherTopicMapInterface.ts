import type { BoundedDispatcherStartEventEntity } from '../entities/BoundedDispatcherStartEventEntity.js';
import type { BoundedDispatcherErrorEventInterface } from './BoundedDispatcherErrorEventInterface.js';
import type { BoundedDispatcherSuccessEventInterface } from './BoundedDispatcherSuccessEventInterface.js';

/**
 * The lifecycle topic every `BoundedDispatcher` event bus carries. Domain topic-map
 * interfaces extend this contract to add their own strongly typed topics.
 */
export interface BoundedDispatcherTopicMapInterface {
  readonly 'dispatch':
    | BoundedDispatcherErrorEventInterface
    | BoundedDispatcherStartEventEntity.Type
    | BoundedDispatcherSuccessEventInterface;
}
