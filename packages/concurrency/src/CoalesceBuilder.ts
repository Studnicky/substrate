import type { Coalesce } from './Coalesce.js';

export class CoalesceBuilder<T> {
  static create<T>(create: () => Coalesce<T>): CoalesceBuilder<T> {
    const result = new CoalesceBuilder(create);
    return result;
  }

  readonly #create: () => Coalesce<T>;

  private constructor(create: () => Coalesce<T>) {
    this.#create = create;
  }

  build(): Coalesce<T> {
    const result = this.#create();
    return result;
  }
}
