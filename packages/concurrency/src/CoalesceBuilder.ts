import type { Coalesce } from './Coalesce.js';
import type { CoalesceOptionsEntity } from './entities/CoalesceOptionsEntity.js';

import { SingleOptionBuilder } from './SingleOptionBuilder.js';

export class CoalesceBuilder<T> {
  static create<T>(create: (options?: CoalesceOptionsEntity.Type) => Coalesce<T>): CoalesceBuilder<T> {
    const result = new CoalesceBuilder(create);
    return result;
  }

  readonly #inner: SingleOptionBuilder<'timeout', number, CoalesceOptionsEntity.Type, Coalesce<T>>;

  private constructor(create: (options?: CoalesceOptionsEntity.Type) => Coalesce<T>) {
    this.#inner = SingleOptionBuilder.create<'timeout', number, CoalesceOptionsEntity.Type, Coalesce<T>>(
      'timeout',
      create
    );
  }

  withTimeout(timeout: number): this {
    this.#inner.withValue(timeout);
    return this;
  }

  build(): Coalesce<T> {
    const result = this.#inner.build();
    return result;
  }
}
