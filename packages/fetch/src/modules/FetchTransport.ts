import { RuntimeError } from '@studnicky/errors';
/**
 * Node HTTP transport selection.
 */

const TEST_TRANSPORT_MARKER = '__substrateFetchTransport';

/**
 * Routes requests through native fetch unless a Node undici dispatcher is supplied.
 */
export class FetchTransport {
  static #isTestTransport(value: object): value is {
    fetch(url: string, init: Record<string, unknown>): Promise<unknown>;
  } {
    const result = Reflect.get(value, TEST_TRANSPORT_MARKER) === true
      && typeof Reflect.get(value, 'fetch') === 'function';
    return result;
  }

  static async fetch(url: string, init: Record<string, unknown>): Promise<Response> {
    const dispatcher = init.dispatcher;

    if (dispatcher !== undefined && dispatcher !== null && typeof dispatcher === 'object' && FetchTransport.#isTestTransport(dispatcher)) {
      const response = await dispatcher.fetch(url, init);
      if (response instanceof Response) {
        return response;
      }
      throw RuntimeError.create('fetch test dispatcher must return a Response');
    }

    if (init.dispatcher === undefined) {
      return await globalThis.fetch(url, init);
    }

    const { fetch } = await import('undici');

    return await fetch(url, init);
  }
}
