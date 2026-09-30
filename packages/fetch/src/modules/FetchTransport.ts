/**
 * Node HTTP transport selection.
 */

import { ConfigurationError, RequestFailedError } from '../errors/index.js';

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
      throw new ConfigurationError('fetch test dispatcher must return a Response');
    }

    try {
      if (init.dispatcher === undefined) {
        const response = await globalThis.fetch(url, init);
        return response;
      }

      const { fetch } = await import('undici');
      const undiciInit = dispatcher === null ? { ...init, 'dispatcher': undefined } : init;
      const response = await fetch(url, undiciInit);
      return response;
    } catch (cause) {
      throw new RequestFailedError(url, cause);
    }
  }
}
