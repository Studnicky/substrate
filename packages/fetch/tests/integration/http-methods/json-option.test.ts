/**
 * Regression tests: the documented `json` option must serialize a body and
 * set Content-Type for FetchClient instance methods.
 */

import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

void describe('json option', () => {
  let testUrl: string;
  const absoluteClient = FetchClient.create();

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void describe('FetchClient', () => {
    void it('serializes json into the request body and sets Content-Type', async () => {
      const client = FetchClient.create({ baseURL: testUrl });

      const response = await client.post('/echo', { json: { a: 1, b: 'two' } });

      assert.strictEqual(response.status, 200);

      const data = await response.json() as { body: unknown; headers: Record<string, string> };

      assert.deepStrictEqual(data.body, { a: 1, b: 'two' });
      assert.strictEqual(data.headers['content-type'], 'application/json');
    });

    void it('prefers body over json when both are provided', async () => {
      const client = FetchClient.create({ baseURL: testUrl });

      const response = await client.post('/echo', {
        body: { winner: true },
        json: { winner: false }
      });

      assert.strictEqual(response.status, 200);

      const data = await response.json() as { body: unknown };

      assert.deepStrictEqual(data.body, { winner: true });
    });
  });

  void describe('absolute URL requests', () => {
    void it('serializes json into the request body and sets Content-Type for post', async () => {
      const response = await absoluteClient.post(`${testUrl}/echo`, { json: { a: 1, b: 'two' } });

      assert.strictEqual(response.status, 200);

      const data = await response.json() as { body: unknown; headers: Record<string, string> };

      assert.deepStrictEqual(data.body, { a: 1, b: 'two' });
      assert.strictEqual(data.headers['content-type'], 'application/json');
    });

    void it('serializes json into the request body for put', async () => {
      const response = await absoluteClient.put(`${testUrl}/posts/1`, { json: { title: 'updated via json' } });

      assert.strictEqual(response.status, 200);

      const data = await response.json() as { title: string };

      assert.strictEqual(data.title, 'updated via json');
    });

    void it('serializes json into the request body for patch', async () => {
      const response = await absoluteClient.patch(`${testUrl}/posts/1`, { json: { title: 'patched via json' } });

      assert.strictEqual(response.status, 200);

      const data = await response.json() as { title: string };

      assert.strictEqual(data.title, 'patched via json');
    });
  });
});
