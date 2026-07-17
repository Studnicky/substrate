/** Generic single-optional-property builder shared by builders that assemble a `{ [key]?: value }` options object. */

export class SingleOptionBuilder<TKey extends string, TValue, TOptions extends Partial<Record<TKey, TValue>>, TResult> {
  static create<TKey extends string, TValue, TOptions extends Partial<Record<TKey, TValue>>, TResult>(
    key: TKey,
    create: (options: TOptions) => TResult
  ): SingleOptionBuilder<TKey, TValue, TOptions, TResult> {
    const result = new SingleOptionBuilder<TKey, TValue, TOptions, TResult>(key, create);
    return result;
  }

  readonly #key: TKey;
  readonly #create: (options: TOptions) => TResult;
  #value: TValue | undefined;

  private constructor(key: TKey, create: (options: TOptions) => TResult) {
    this.#key = key;
    this.#create = create;
  }

  withValue(value: TValue): this {
    this.#value = value;
    return this;
  }

  build(): TResult {
    const partial: Partial<Record<TKey, TValue>> = {};
    if (this.#value !== undefined) {
      partial[this.#key] = this.#value;
    }
    const options = partial as TOptions;
    const result = this.#create(options);
    return result;
  }
}
