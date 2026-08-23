/**
 * Node HTTP transport selection.
 */

const TEST_TRANSPORT_MARKER = '__substrateFetchTransport';

/**
 * Routes requests through native fetch unless a Node undici dispatcher is supplied.
 */
export class FetchTransport {
  static async fetch(url: string, init: Record<string, unknown>): Promise<Response> {
    const dispatcher = init.dispatcher;

    if (dispatcher !== undefined && dispatcher !== null && typeof dispatcher === 'object') {
      const maybeTestTransport = dispatcher as Record<string, unknown>;

      if (Reflect.get(maybeTestTransport, TEST_TRANSPORT_MARKER) === true && typeof maybeTestTransport.fetch === 'function') {
        return (await maybeTestTransport.fetch(url, init)) as Response;
      }
    }

    if (init.dispatcher === undefined) {
      return await globalThis.fetch(url, init);
    }

    const { fetch } = await import('undici');

    return await fetch(url, init);
  }
}
