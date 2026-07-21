/** 01-client-config — construct a FetchClient with shared request defaults. Run: npx tsx packages/fetch/examples/01-client-config.ts */

import assert from 'node:assert/strict';

// #region usage
import { FetchClient } from '../src/index.js';

const api = FetchClient.create({
  'autoGenerateRequestId': true,
  'baseURL': 'https://api.example.com',
  'headers': {
    'Authorization': 'Bearer demo-token',
    'X-Client-Name': 'example'
  },
  'timeout': 8000
});

// Execute requests directly through the verb methods:
// await api.get('/users?page=1&limit=20', {
//   headers: { 'X-Correlation-ID': 'abc-123' },
//   metadata: { operation: 'listUsers', source: 'dashboard' },
//   timeout: 3000
// });
// #endregion usage

assert.ok(api instanceof FetchClient);

console.log('01-client-config: all assertions passed');
