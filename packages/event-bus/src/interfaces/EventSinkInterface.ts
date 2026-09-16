/**
 * Minimal contract for publishing typed events.
 */
export interface EventSinkInterface<TTopicMap extends object> {
  publish<K extends keyof TTopicMap>(topic: K, payload: TTopicMap[K]): Promise<void>;
}
