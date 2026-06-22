import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

void describe('FetchClient HTTP Methods', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void it('should perform GET request', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client.get('/posts/1');

    assert.strictEqual(response.status, 200);
  });

  void it('should perform POST request with JSON', async () => {
    const client = FetchClient.create({ baseURL: testUrl });

    const body = {
      body: 'content',
      title: 'test',
      userId: 1
    };
    const response = await client.post('/posts', body);

    assert.strictEqual(response.status, 201);

    const data = await response.json() as { title: string };

    assert.strictEqual(data.title, body.title);
  });

  void it('should perform PUT request', async () => {
    const client = FetchClient.create({ baseURL: testUrl });

    const body = {
      body: 'content',
      id: 1,
      title: 'updated',
      userId: 1
    };
    const response = await client.put('/posts/1', body);

    assert.strictEqual(response.status, 200);
  });

  void it('should perform PATCH request', async () => {
    const client = FetchClient.create({ baseURL: testUrl });

    const body = { title: 'patched' };
    const response = await client.patch('/posts/1', body);

    assert.strictEqual(response.status, 200);
  });

  void it('should perform DELETE request', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client.delete('/posts/1');

    assert.strictEqual(response.status, 200);
  });

  void it('should perform HEAD request', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client.head('/posts/1');

    assert.strictEqual(response.status, 200);
  });

  void it('should perform OPTIONS request', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client.options('/posts/1');

    assert.ok(response.status >= 200 && response.status < 300);
  });
});
