import { BrowserFetchClient } from '@studnicky/fetch/browser';
import { Retry } from '@studnicky/retry';

import { RequestExecutor } from '../src/index.js';

const originalFetch = globalThis.fetch;
let failuresRemaining = 2;

globalThis.fetch = (): Promise<Response> => {
  if (failuresRemaining > 0) {
    failuresRemaining -= 1;
    const result = Promise.resolve(new Response('retry', { 'status': 503 }));
    return result;
  }

  const result = Promise.resolve(new Response('ready', { 'status': 200 }));
  return result;
};

try {
  const executor = RequestExecutor.create({
    'fetchClient': BrowserFetchClient.create({ 'baseURL': 'https://example.test' }),
    'retry': Retry.create({ 'maximumRetries': 3 })
  });
  const response = await executor.execute(async (client, signal): Promise<Response> => {
    const result = await client.get('/health', { 'signal': signal });
    if (!result.ok) {
      throw new Error(`HTTP ${String(result.status)}`);
    }
    return result;
  });

  console.log({ 'body': await response.text(), 'status': response.status });
} finally {
  globalThis.fetch = originalFetch;
}
