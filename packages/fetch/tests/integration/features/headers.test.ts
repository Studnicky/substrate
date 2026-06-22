import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

void describe('Default Headers Feature', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void it('should apply default headers', async () => {
    const client = FetchClient.create({ headers: { 'X-Custom': 'default-value' } });

    const response = await client.get(`${testUrl}/posts/1`);

    assert.strictEqual(response.status, 200);
  });

  void it('should merge default and request headers', async () => {
    const client = FetchClient.create({ headers: { 'X-Default': 'default' } });

    const response = await client.get(`${testUrl}/posts/1`, { headers: { 'X-Request': 'request' } });

    assert.strictEqual(response.status, 200);
  });

  void it('should allow request headers to override defaults', async () => {
    const client = FetchClient.create({ headers: { 'X-Custom': 'default' } });

    const response = await client.get(`${testUrl}/posts/1`, { headers: { 'X-Custom': 'override' } });

    assert.strictEqual(response.status, 200);
  });
});
