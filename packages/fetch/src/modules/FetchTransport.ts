/**
 * Node HTTP transport selection.
 */

/**
 * Routes requests through native fetch unless a Node undici dispatcher is supplied.
 */
export class FetchTransport {
  static async fetch(url: string, init: Record<string, unknown>): Promise<Response> {
    if (init.dispatcher === undefined) {
      return await globalThis.fetch(url, init);
    }

    const { fetch } = await import('undici');

    return await fetch(url, init);
  }
}
