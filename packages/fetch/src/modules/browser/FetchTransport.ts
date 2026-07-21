/**
 * Browser HTTP transport selection.
 */

import { ConfigurationError } from '../../errors/index.js';

const BROWSER_ERROR_MESSAGE =
  'undici connection pooling requires a Node.js runtime; the browser uses native fetch';

/**
 * Routes browser requests through native fetch and rejects Node-only dispatchers.
 */
export class FetchTransport {
  static async fetch(url: string, init: Record<string, unknown>): Promise<Response> {
    if (init.dispatcher !== undefined) {
      throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
    }

    return await globalThis.fetch(url, init);
  }
}
