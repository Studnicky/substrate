/** Answers the same request id on every call. */
export class StaticRequestIdGenerator {
  readonly generate = (): unknown => {
    return this.#value;
  };

  readonly #value: unknown;

  constructor(value: unknown) {
    this.#value = value;
  }
}
