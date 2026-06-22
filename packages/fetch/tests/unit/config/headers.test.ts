import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';

void describe('headers validation', () => {
  void it('should reject non-object headers', () => {
    assert.throws(() => {
      FetchClient.create({ headers: 'invalid' as never });
    }, /headers must be an object/u);
  });

  void it('should reject array headers', () => {
    assert.throws(() => {
      FetchClient.create({ headers: [] as never });
    }, /headers must be an object/u);
  });

  void it('should reject non-string header values', () => {
    assert.throws(() => {
      const invalidConfig = { headers: { 'X-Custom': 123 } };

      // @ts-expect-error Testing invalid header value type
      FetchClient.create(invalidConfig);
    }, /header value for "X-Custom" must be a string/u);
  });

  void it('should accept valid headers', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({ headers: { Authorization: 'Bearer token' } });
    });
  });
});
