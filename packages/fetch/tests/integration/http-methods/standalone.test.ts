import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

const client = FetchClient.create();

void describe('FetchClient HTTP methods with absolute URLs', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void describe('GET', () => {
    void it('should make GET request', async () => {
      const response = await client.get(`${testUrl}/posts/1`);

      assert.strictEqual(response.status, 200);
      const data = await response.json();

      assert.ok(data !== null && data !== undefined);
      assert.ok(typeof data === 'object' && 'id' in data && data.id !== null && data.id !== undefined);
    });
  });

  void describe('POST', () => {
    void it('should make POST request with JSON body', async () => {
      const body = {
        body: 'content',
        title: 'test',
        userId: 1
      };
      const response = await client.post(`${testUrl}/posts`, { body });

      assert.strictEqual(response.status, 201);
      const data = await response.json() as { title: string };

      assert.strictEqual(data.title, body.title);
    });

    void it('should auto-set Content-Type for JSON', async () => {
      const response = await client.post(`${testUrl}/posts`, {
        body: {
          body: 'content',
          title: 'test',
          userId: 1
        }
      });

      assert.strictEqual(response.status, 201);
    });

    void it('should support string body', async () => {
      const response = await client.post(`${testUrl}/posts`, { body: 'plain text' });

      assert.strictEqual(response.status, 201);
    });
  });

  void describe('PUT', () => {
    void it('should make PUT request with JSON body', async () => {
      const body = {
        body: 'content',
        id: 1,
        title: 'updated',
        userId: 1
      };
      const response = await client.put(`${testUrl}/posts/1`, { body });

      assert.strictEqual(response.status, 200);
      const data = await response.json() as { title: string };

      assert.strictEqual(data.title, body.title);
    });

    void it('should auto-set Content-Type for JSON', async () => {
      const response = await client.put(`${testUrl}/posts/1`, {
        body: {
          body: 'content',
          id: 1,
          title: 'test',
          userId: 1
        }
      });

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('PATCH', () => {
    void it('should make PATCH request with JSON body', async () => {
      const body = { title: 'partial update' };
      const response = await client.patch(`${testUrl}/posts/1`, { body });

      assert.strictEqual(response.status, 200);
      const data = await response.json() as { title: string };

      assert.strictEqual(data.title, body.title);
    });

    void it('should auto-set Content-Type for JSON', async () => {
      const response = await client.patch(`${testUrl}/posts/1`, { body: { title: 'patched' } });

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('DELETE', () => {
    void it('should make DELETE request', async () => {
      const response = await client.delete(`${testUrl}/posts/1`);

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('HEAD', () => {
    void it('should make HEAD request', async () => {
      const response = await client.head(`${testUrl}/posts/1`);

      assert.strictEqual(response.status, 200);
    });

    void it('should not include response body', async () => {
      const response = await client.head(`${testUrl}/posts/1`);
      const text = await response.text();

      assert.strictEqual(text, '');
    });
  });

  void describe('OPTIONS', () => {
    void it('should make OPTIONS request', async () => {
      const response = await client.options(`${testUrl}/posts/1`);

      assert.ok(response.status >= 200 && response.status < 300);
    });
  });
});
