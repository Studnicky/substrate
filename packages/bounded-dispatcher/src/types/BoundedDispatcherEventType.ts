/**
 * Lifecycle event payload published on the `'dispatch'` topic
 */

/**
 * Payload published onto the composed `EventBus`'s `'dispatch'` topic around every
 * `BoundedDispatcher#dispatch()` call. `result`/`error` are only present on the
 * matching `phase`.
 */
export type BoundedDispatcherEventType =
  | { 'error': unknown; 'phase': 'error' }
  | { 'phase': 'start' }
  | { 'phase': 'success'; 'result': unknown };
