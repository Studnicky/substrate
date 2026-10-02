import { JsonObject } from '@studnicky/types/node';

import { PlatformCalls } from './PlatformCalls.js';

/**
 * Replaces `globalThis.fetch` with an in-memory router: `/echo-headers` answers with the request headers
 * as JSON, `/ok` answers with `{ "value": "original" }`, and every other path answers 404.
 * `using fake = RoutedFakeFetch.install()` restores the original `fetch` when the scope ends.
 */
export class RoutedFakeFetch implements Disposable {
  readonly #original: typeof globalThis.fetch;

  private constructor(original: typeof globalThis.fetch) {
    this.#original = original;
  }

  static install(): RoutedFakeFetch {
    const fake = new RoutedFakeFetch(globalThis.fetch);
    globalThis.fetch = (input, init): Promise<Response> => {
      const routed = RoutedFakeFetch.#route(input, init);
      return routed;
    };
    return fake;
  }

  static #route(input: Request | URL | string, init: RequestInit | undefined): Promise<Response> {
    const { pathname } = PlatformCalls.parseUrl(String(input));
    if (pathname === '/echo-headers') {
      const echoed = Promise.resolve(new Response(PlatformCalls.stringify({ 'headers': RoutedFakeFetch.plainHeaders(init?.headers) }), {
        'headers': { 'Content-Type': 'application/json' },
        'status': 200
      }));
      return echoed;
    }
    if (pathname === '/ok') {
      const answered = Promise.resolve(new Response(PlatformCalls.stringify({ 'value': 'original' }), {
        'headers': { 'Content-Type': 'application/json' },
        'status': 200
      }));
      return answered;
    }
    const missing = Promise.resolve(new Response('', { 'status': 404 }));
    return missing;
  }

  static plainHeaders(headers: RequestInit['headers']): Record<string, string> {
    const normalized = new Headers(headers);
    const entries = Array.from(normalized.entries());
    const result = new Map<string, string>();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined) {
        result.set(entry[0], entry[1]);
      }
    }
    const plain = JsonObject.fromEntries(result);
    return plain;
  }

  [Symbol.dispose](): void {
    globalThis.fetch = this.#original;
  }
}
