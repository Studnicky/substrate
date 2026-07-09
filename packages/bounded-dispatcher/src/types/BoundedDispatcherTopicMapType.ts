/**
 * Topic map merge helper — the `'dispatch'` lifecycle topic plus a caller's own topics
 */

import type { BoundedDispatcherEventType } from './BoundedDispatcherEventType.js';

/**
 * The `'dispatch'` lifecycle topic every `BoundedDispatcher`-composed `EventBus` carries,
 * merged onto a caller-supplied `TTopicMap` via `BoundedDispatcherComposedTopicMapType`.
 */
export type BoundedDispatcherTopicMapType = {
  'dispatch': BoundedDispatcherEventType;
};

/**
 * The full topic map the composed `EventBus` carries: the caller's own `TTopicMap` merged
 * with the `'dispatch'` lifecycle topic. `getBus()` returns `EventBus` typed with this merge,
 * so the caller's additional topics stay fully typed alongside `'dispatch'` on the same bus.
 */
export type BoundedDispatcherComposedTopicMapType<TTopicMap extends Record<string, unknown>> =
  BoundedDispatcherTopicMapType & TTopicMap;
