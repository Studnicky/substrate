import type { SemaphoreOptionsEntity } from './entities/SemaphoreOptionsEntity.js';
import type { Semaphore } from './Semaphore.js';

export class SemaphoreBuilder {
  static create(create: (options: SemaphoreOptionsEntity.Type) => Semaphore): SemaphoreBuilder {
    const result = new SemaphoreBuilder(create);
    return result;
  }

  readonly #create: (options: SemaphoreOptionsEntity.Type) => Semaphore;
  #permits: number | undefined;

  private constructor(create: (options: SemaphoreOptionsEntity.Type) => Semaphore) {
    this.#create = create;
  }

  withPermits(permits: number): this {
    this.#permits = permits;
    return this;
  }

  build(): Semaphore {
    const result = this.#create({ 'permits': this.#permits ?? 1 });
    return result;
  }
}
