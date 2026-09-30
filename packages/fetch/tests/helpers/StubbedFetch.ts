/**
 * Replaces `globalThis.fetch` with a stub that records each call and answers with a fixed `Response`.
 * `using stub = StubbedFetch.install(response)` restores the original `fetch` when the scope ends.
 */
export class StubbedFetch implements Disposable {
  callCount = 0;
  headers: Headers | undefined;
  init: RequestInit | undefined;
  url = '';

  readonly #original: typeof globalThis.fetch;

  private constructor(original: typeof globalThis.fetch) {
    this.#original = original;
  }

  static install(response: Response): StubbedFetch {
    const stub = new StubbedFetch(globalThis.fetch);
    globalThis.fetch = (input, init): Promise<Response> => {
      stub.callCount += 1;
      stub.url = String(input);
      stub.init = init;
      stub.headers = new Headers(init?.headers);
      const answered = Promise.resolve(response);
      return answered;
    };
    return stub;
  }

  [Symbol.dispose](): void {
    globalThis.fetch = this.#original;
  }
}
