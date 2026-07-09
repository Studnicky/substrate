import type { Coalesce } from './Coalesce.js';
import type { CoalesceOptionsType } from './CoalesceOptionsType.js';

export class CoalesceBuilder<T> {
  static create<T>(create: (options?: CoalesceOptionsType) => Coalesce<T>): CoalesceBuilder<T> {
    const result = new CoalesceBuilder(create);
    return result;
  }

  readonly #create: (options?: CoalesceOptionsType) => Coalesce<T>;
  #timeout: number | undefined;

  private constructor(create: (options?: CoalesceOptionsType) => Coalesce<T>) {
    this.#create = create;
  }

  withTimeout(timeout: number): this {
    this.#timeout = timeout;
    return this;
  }

  build(): Coalesce<T> {
    const options: CoalesceOptionsType = this.#timeout === undefined
      ? {}
      : { 'timeout': this.#timeout };
    const result = this.#create(options);
    return result;
  }
}
