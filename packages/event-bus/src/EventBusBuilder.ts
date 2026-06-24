/** Fluent builder for creating EventBus instances. */

import type { EventBus } from './EventBus.js';

export class EventBusBuilder<TTopicMap extends Record<string, unknown>> {
  static create<TTopicMap extends Record<string, unknown>>(
    create: () => EventBus<TTopicMap>
  ): EventBusBuilder<TTopicMap> {
    const result = new EventBusBuilder<TTopicMap>(create);
    return result;
  }

  readonly #create: () => EventBus<TTopicMap>;

  private constructor(create: () => EventBus<TTopicMap>) {
    this.#create = create;
  }

  build(): EventBus<TTopicMap> {
    const result = this.#create();
    return result;
  }
}
