import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { FetchClientInterface } from '../../../src/interfaces/FetchClientInterface.js';

import { BrowserFetchClient } from '../../../src/browser/index.js';
import { ConfigurationError } from '../../../src/errors/index.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { StubbedFetch } from '../../helpers/StubbedFetch.js';

void it('satisfies the shared client contract through native fetch', async () => {
  const client: FetchClientInterface = BrowserFetchClient.create({
    'baseURL': 'https://example.test',
    'headers': { 'X-Client': 'browser' },
    'parameters': { 'page': 2 }
  });
  using stub = StubbedFetch.install(new Response('ok'));

  const response = await client.post('/records', { 'json': { 'id': 1 } });

  assert.equal(response.status, 200);
  assert.equal(stub.url, 'https://example.test/records?page=2');
  assert.equal(stub.headers?.get('Content-Type'), 'application/json');
  assert.equal(stub.headers?.get('X-Client'), 'browser');
  await client.destroy();
});

void it('rejects a fractional timeout before dispatching a browser request', async () => {
  using stub = StubbedFetch.install(new Response());
  const client = BrowserFetchClient.create();

  const caught = await RejectionProbe.capture(async () => {
    await client.get('https://example.test/records', { 'timeout': 50.5 });
  });
  assert.ok(caught instanceof ConfigurationError);
  assert.ok(caught.message.includes('integer'));
  assert.equal(stub.callCount, 0);
});

void it('intakes browser configuration and preserves its detached request values', async () => {
  const headers = { 'X-Client': 'original' };
  const parameters = { 'filter': undefined, 'page': 1 };
  const client = BrowserFetchClient.create({
    'headers': headers,
    'parameters': parameters
  });
  headers['X-Client'] = 'changed';
  parameters.page = 2;
  using stub = StubbedFetch.install(new Response('ok'));

  await client.get('https://example.test/records');

  assert.equal(stub.headers?.get('X-Client'), 'original');
  assert.equal(stub.url, 'https://example.test/records?page=1');
  const unknownKey = RejectionProbe.captureSync(() => {
    const invalidConfig: object = { 'unknown': true };
    const created = BrowserFetchClient.create(invalidConfig);
    return created;
  });
  assert.ok(unknownKey instanceof ConfigurationError);
  assert.ok(unknownKey.message.includes('must NOT have additional properties'));
  const nestedFilter = RejectionProbe.captureSync(() => {
    const invalidConfig: object = { 'parameters': { 'filter': { 'status': 'active' } } };
    const created = BrowserFetchClient.create(invalidConfig);
    return created;
  });
  assert.ok(nestedFilter instanceof ConfigurationError);
  assert.ok(nestedFilter.message.includes('/filter'));
});
