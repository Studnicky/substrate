/** Fluent builder for creating EventBus instances. */

import type { BusQueueOptionsEntity } from './entities/BusQueueOptionsEntity.js';
import type { EventBus } from './EventBus.js';

export class EventBusBuilder<TTopicMap extends Record<string, unknown>> {
  static create<TTopicMap extends Record<string, unknown>>(
    create: (config: BusQueueOptionsEntity.Type) => EventBus<TTopicMap>
  ): EventBusBuilder<TTopicMap> {
    const result = new EventBusBuilder<TTopicMap>(create);
    return result;
  }

  readonly #create: (config: BusQueueOptionsEntity.Type) => EventBus<TTopicMap>;
  #highWaterMark: number | undefined;

  private constructor(create: (config: BusQueueOptionsEntity.Type) => EventBus<TTopicMap>) {
    this.#create = create;
  }

  withHighWaterMark(value: number): this {
    this.#highWaterMark = value;
    return this;
  }

  build(): EventBus<TTopicMap> {
    const config: BusQueueOptionsEntity.Type = this.#highWaterMark !== undefined
      ? { 'highWaterMark': this.#highWaterMark }
      : {};
    const result = this.#create(config);
    return result;
  }
}
