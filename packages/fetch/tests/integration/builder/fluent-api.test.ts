import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

void describe('Fluent Request Builder', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void it('should build and execute GET request', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client.request('/posts/1').get();

    assert.strictEqual(response.status, 200);
  });

  void it('should build request with query params', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client
      .request('/posts')
      .queryString('_limit', 5)
      .queryString('_page', 1)
      .get();

    assert.strictEqual(response.status, 200);

    const data = await response.json();

    assert.ok(Array.isArray(data));
    assert.ok(data.length <= 5);
  });

  void it('should build request with headers', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client
      .request('/posts/1')
      .header('X-Custom', 'value')
      .get();

    assert.strictEqual(response.status, 200);
  });

  void it('should build request with multiple headers', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client
      .request('/posts/1')
      .headers({
        'X-First': 'first',
        'X-Second': 'second'
      })
      .get();

    assert.strictEqual(response.status, 200);
  });

  void it('should build request with timeout', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client
      .request('/posts/1')
      .timeout(5000)
      .get();

    assert.strictEqual(response.status, 200);
  });

  void it('should build POST request with body', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const body = {
      body: 'content',
      title: 'test',
      userId: 1
    };
    const response = await client
      .request('/posts')
      .body(body)
      .post();

    assert.strictEqual(response.status, 201);

    const data = await response.json() as { title: string };

    assert.strictEqual(data.title, body.title);
  });

  void it('should build POST request with json shorthand', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const body = {
      body: 'content',
      title: 'test',
      userId: 1
    };
    const response = await client
      .request('/posts')
      .json(body)
      .post();

    assert.strictEqual(response.status, 201);

    const data = await response.json() as { title: string };

    assert.strictEqual(data.title, body.title);
  });

  void it('should chain multiple configurations', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client
      .request('/posts')
      .queryString('_page', '1')
      .header('X-Custom', 'value')
      .json({
        body: 'content',
        title: 'test',
        userId: 1
      })
      .timeout(5000)
      .post();

    assert.strictEqual(response.status, 201);
  });

  void it('should execute PUT request', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client
      .request('/posts/1')
      .json({
        body: 'content',
        id: 1,
        title: 'updated',
        userId: 1
      })
      .put();

    assert.strictEqual(response.status, 200);
  });

  void it('should execute PATCH request', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client
      .request('/posts/1')
      .json({ title: 'patched' })
      .patch();

    assert.strictEqual(response.status, 200);
  });

  void it('should execute DELETE request', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client
      .request('/posts/1')
      .delete();

    assert.strictEqual(response.status, 200);
  });

  void it('should execute HEAD request', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client
      .request('/posts/1')
      .head();

    assert.strictEqual(response.status, 200);
  });

  void it('should execute OPTIONS request', async () => {
    const client = FetchClient.create({ baseURL: testUrl });
    const response = await client
      .request('/posts/1')
      .options();

    assert.ok(response.status >= 200 && response.status < 300);
  });
});
