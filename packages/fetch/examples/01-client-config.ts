/** 01-client-config — FetchClient configuration and RequestBuilder construction. Run: npx tsx packages/fetch/examples/01-client-config.ts */

import assert from 'node:assert/strict';

// #region usage
import { FetchClient, RequestBuilder } from '../src/index.js';

// Create a configured client with base URL, headers, and timeout
const api = FetchClient.create({
  'autoGenerateRequestId': true,
  'baseURL': 'https://api.example.com',
  'headers': { 'Authorization': 'Bearer demo-token', 'X-Client-Name': 'example' },
  'timeout': 8000
});

console.log('FetchClient created with baseURL, headers, and timeout');

// Chain request builder options: path, query params, extra header, per-request timeout
const builder = api
  .request('/users')
  .queryString('page', 1)
  .queryString('limit', 20)
  .header('X-Correlation-ID', 'abc-123')
  .timeout(3000)
  .metadata({ 'operation': 'listUsers', 'source': 'dashboard' });

console.log('RequestBuilder chained: path=/users, page=1, limit=20, timeout=3000ms');
// #endregion usage

assert.ok(api instanceof FetchClient, 'FetchClient.create() returns a FetchClient instance');
assert.ok(builder instanceof RequestBuilder, '.request() returns a RequestBuilder');

console.log('01-client-config: all assertions passed');
