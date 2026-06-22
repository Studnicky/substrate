import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

void describe('Default Query Params Feature', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void it('should apply default query params', async () => {
    const client = FetchClient.create({
      baseURL: testUrl,
      params: {
        _limit: '5',
        _page: '1'
      }
    });

    const response = await client.get('/posts');

    assert.strictEqual(response.status, 200);

    const data = await response.json();

    assert.ok(Array.isArray(data));
    assert.ok(data.length <= 5);
  });
});
