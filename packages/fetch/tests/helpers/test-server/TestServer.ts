import { ConfigurationError } from '../../../src/errors/index.js';
import { TestDispatcher } from '../../../src/testing/TestDispatcher.js';

/**
 * Routes `globalThis.fetch` through an in-process `TestDispatcher` while at least one handle is open.
 * `TestServer.start()` returns a handle whose disposal releases it; the transport is restored when the
 * last handle is released.
 */
export class TestServer implements Disposable {
  static readonly #url = 'http://127.0.0.1:41234';
  static #activeUsers = 0;
  static #originalFetch: typeof globalThis.fetch | undefined;
  static #originalTransportFlag: string | undefined;
  static #testDispatcher: TestDispatcher | undefined;

  /** The server origin; the URL carries no path, so both are the same string. */
  readonly origin: string = TestServer.#url;
  readonly url: string = TestServer.#url;
  #released = false;

  private constructor() {}

  static start(): TestServer {
    TestServer.#activeUsers += 1;
    if (TestServer.#activeUsers === 1) {
      TestServer.#installTransport();
      TestServer.#log('start');
    } else {
      TestServer.#log('reuse');
    }
    const handle = new TestServer();
    return handle;
  }

  static resolveUrl(): string {
    if (TestServer.#activeUsers === 0) {
      throw new ConfigurationError('Test server not started. Call TestServer.start() first.');
    }
    return TestServer.#url;
  }

  static #createFetchAdapter(dispatcher: TestDispatcher): typeof globalThis.fetch {
    const adapter: typeof globalThis.fetch = async (input, init) => {
      const initRecord: Record<string, unknown> = { ...init };
      const response = await dispatcher.fetch(TestServer.#resolveRequestUrl(input), initRecord);
      return response;
    };
    return adapter;
  }

  static #installTransport(): void {
    TestServer.#originalFetch ??= globalThis.fetch;
    TestServer.#originalTransportFlag ??= process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
    process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = '1';
    TestServer.#testDispatcher ??= TestDispatcher.create({
      'connections': 64,
      'enabled': true,
      'pipelining': 1
    });
    globalThis.fetch = TestServer.#createFetchAdapter(TestServer.#testDispatcher);
  }

  static #log(event: string): void {
    if (process.env.SUBSTRATE_FETCH_TEST_LOG === '1') {
      process.stderr.write(`[fetch-test-server] ${event} activeUsers=${String(TestServer.#activeUsers)} url=${TestServer.#url}\n`);
    }
  }

  static #release(): void {
    if (TestServer.#activeUsers > 0) {
      TestServer.#activeUsers -= 1;
      if (TestServer.#activeUsers === 0) {
        TestServer.#restoreTransport();
        TestServer.#log('stop');
      } else {
        TestServer.#log('retain');
      }
    }
  }

  static #resolveRequestUrl(input: Request | URL | string): string {
    if (typeof input === 'string') {
      return input;
    }
    if (input instanceof URL) {
      return input.href;
    }
    return input.url;
  }

  static #restoreTransport(): void {
    if (typeof TestServer.#originalFetch !== 'undefined') {
      globalThis.fetch = TestServer.#originalFetch;
    }
    if (typeof TestServer.#originalTransportFlag === 'undefined') {
      Reflect.deleteProperty(process.env, 'SUBSTRATE_FETCH_TEST_TRANSPORT');
    } else {
      process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = TestServer.#originalTransportFlag;
    }
    TestServer.#testDispatcher = undefined;
  }

  [Symbol.dispose](): void {
    if (this.#released === false) {
      this.#released = true;
      TestServer.#release();
    }
  }
}
