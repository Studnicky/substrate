/**
 * FetchClient configuration and RequestBuilder construction.
 *
 * Demonstrates: FetchClient.create(), .request(), .queryString(), .header(), .timeout()
 *
 * Run: npx tsx packages/fetch/examples/01-client-config.ts
 */
import assert from 'node:assert/strict';

import { FetchClient, RequestBuilder } from '../src/index.js';

// Create a configured client
const api = FetchClient.create({
  baseURL: 'https://api.example.com',
  headers: { Authorization: 'Bearer demo-token', 'X-Client-Name': 'example' },
  timeout: 8000,
  autoGenerateRequestId: true
});

assert.ok(api instanceof FetchClient, 'FetchClient.create() returns a FetchClient instance');

// Build a request and verify the builder is the right type
const builder = api
  .request('/users')
  .queryString('page', 1)
  .queryString('limit', 20)
  .header('X-Correlation-ID', 'abc-123')
  .timeout(3000)
  .metadata({ operation: 'listUsers', source: 'dashboard' });

assert.ok(builder instanceof RequestBuilder, '.request() returns a RequestBuilder');

console.log('FetchClient created with baseURL, headers, and timeout');
console.log('RequestBuilder chained: path=/users, page=1, limit=20, timeout=3000ms');
