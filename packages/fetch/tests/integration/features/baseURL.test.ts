import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

void describe('BaseURL Feature', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void it('should prepend baseURL to relative paths', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client.get('/posts/1');

    assert.strictEqual(response.status, 200);
  });

  void it('should not modify absolute URLs', async () => {
    const client = FetchClient.create({ baseURL: 'https://example.com' });
    const response = await client.get(`${testUrl}/posts/1`);

    assert.strictEqual(response.status, 200);
  });

  void it('should handle baseURL with trailing slash', async () => {
    const client = FetchClient.create({ baseURL: `${testUrl}/` });
    const response = await client.get('/posts/1');

    assert.strictEqual(response.status, 200);
  });

  void it('should handle path without leading slash', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client.get('posts/1');

    assert.strictEqual(response.status, 200);
  });
});
