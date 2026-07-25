import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ClientConfigDataEntity, FetchRequestOptionsEntity } from '../../../src/index.js';

void describe('fetch data entities', () => {
  void it('validates schema-expressible request options', () => {
    assert.equal(FetchRequestOptionsEntity.validate({
      'cache': 'no-store',
      'keepalive': true,
      'method': 'GET',
      'timeout': 500
    }), true);
    assert.equal(FetchRequestOptionsEntity.validate({ 'redirect': 'elsewhere' }), false);
  });

  void it('validates schema-expressible client configuration', () => {
    assert.equal(ClientConfigDataEntity.validate({
      'autoGenerateRequestId': true,
      'baseURL': 'https://example.test',
      'hookTimeoutMs': 100,
      'timeout': 500
    }), true);
    assert.equal(ClientConfigDataEntity.validate({ 'timeout': -1 }), false);
  });
});
