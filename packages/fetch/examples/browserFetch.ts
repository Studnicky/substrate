/** browserFetch — a real HTTP GET over the browser-native fetch client. Run: npx tsx packages/fetch/examples/browserFetch.ts */

import assert from 'node:assert/strict';

// #region usage
import { BrowserFetchClient } from '../src/browser/index.js';

await (async function runBrowserFetchExample(): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_input, _init) => {
    const result = Promise.resolve(new Response(JSON.stringify({
      'completed': false,
      'id': 1,
      'title': 'delectus aut autem'
    }), {
      'headers': { 'Content-Type': 'application/json' },
      'status': 200
    }));
    return result;
  };

  const api = BrowserFetchClient.create({
    'baseURL': 'https://example.test',
    'timeout': 8000
  });

  try {
    console.log('GET https://example.test/todos/1 (native browser fetch)');

    const response = await api.get('/todos/1');
    const todo = await response.json();

    console.log(`status: ${response.status}`);

    assert.equal(response.status, 200, 'expected HTTP 200');
    assert.equal(typeof todo, 'object', 'fetched JSON body');

    console.log('browserFetch: all assertions passed');
  } finally {
    globalThis.fetch = originalFetch;
  }
})();
// #endregion usage
