/**
 * Sets `SUBSTRATE_FETCH_TEST_TRANSPORT=1` so dispatcher creation returns the in-process `TestDispatcher`.
 * `using flag = TestTransportFlag.enable()` restores the previous value when the scope ends.
 */
export class TestTransportFlag implements Disposable {
  static readonly #variable = 'SUBSTRATE_FETCH_TEST_TRANSPORT';

  readonly #previous: string | undefined;

  private constructor(previous: string | undefined) {
    this.#previous = previous;
  }

  static enable(): TestTransportFlag {
    const flag = new TestTransportFlag(process.env.SUBSTRATE_FETCH_TEST_TRANSPORT);
    process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = '1';
    return flag;
  }

  [Symbol.dispose](): void {
    if (this.#previous === undefined) {
      Reflect.deleteProperty(process.env, TestTransportFlag.#variable);
    } else {
      process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = this.#previous;
    }
  }
}
