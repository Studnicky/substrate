import type { Coalesce } from './Coalesce.js';
import type { CoalesceOptionsEntity } from './entities/CoalesceOptionsEntity.js';

export class CoalesceBuilder<T> {
  static create<T>(create: (options?: CoalesceOptionsEntity.Type) => Coalesce<T>): CoalesceBuilder<T> {
    const result = new CoalesceBuilder(create);
    return result;
  }

  readonly #create: (options?: CoalesceOptionsEntity.Type) => Coalesce<T>;
  #timeout: number | undefined;

  private constructor(create: (options?: CoalesceOptionsEntity.Type) => Coalesce<T>) {
    this.#create = create;
  }

  withTimeout(timeout: number): this {
    this.#timeout = timeout;
    return this;
  }

  build(): Coalesce<T> {
    const options: CoalesceOptionsEntity.Type = this.#timeout === undefined
      ? {}
      : { 'timeout': this.#timeout };
    const result = this.#create(options);
    return result;
  }
}
