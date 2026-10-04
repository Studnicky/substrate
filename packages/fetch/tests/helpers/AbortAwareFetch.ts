import { CallerFault } from '@studnicky/types/node';

/**
 * Replaces `globalThis.fetch` with a stub that never answers and rejects with the abort reason when the
 * request signal aborts. `using stub = AbortAwareFetch.install()` restores the original `fetch` when the
 * scope ends.
 */
export class AbortAwareFetch implements Disposable {
  readonly #original: typeof globalThis.fetch;

  private constructor(original: typeof globalThis.fetch) {
    this.#original = original;
  }

  static install(): AbortAwareFetch {
    const stub = new AbortAwareFetch(globalThis.fetch);
    globalThis.fetch = (_input, init): Promise<Response> => {
      const pending = AbortAwareFetch.#awaitAbort(init?.signal);
      return pending;
    };
    return stub;
  }

  static #awaitAbort(signal: AbortSignal | null | undefined): Promise<Response> {
    const pending = new Promise<Response>((resolve) => {
      if (signal instanceof AbortSignal) {
        if (signal.aborted) {
          resolve(CallerFault.rejection(signal.reason));
        } else {
          signal.addEventListener('abort', () => {
            resolve(CallerFault.rejection(signal.reason));
          }, { 'once': true });
        }
      }
    });
    return pending;
  }

  [Symbol.dispose](): void {
    globalThis.fetch = this.#original;
  }
}
